const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const {
  DEFAULT_SETTINGS,
  validateSettings,
  normalizeRateLimits,
  extractPoints,
  digitalOceanTraffic,
  codexQuota,
  forecastQuota,
  demoSnapshot,
} = require('../electron/providers.cjs');
const configured = { ...DEFAULT_SETTINGS, digitalOcean: { dropletId: '12345' } };
const response = (values) => ({ ok: true, json: async () => ({ data: { result: [{ values }] } }) });

test('四主题持久化校验、旧 Arctic 迁移与未知主题回退', () => {
  const definitions = require('../shared/themes.json');
  assert.deepEqual(
    definitions.map((theme) => theme.id),
    ['rider', 'abyss', 'warframe', 'anime'],
  );
  for (const theme of definitions) {
    const settings = validateSettings({ ...DEFAULT_SETTINGS, theme: theme.id });
    assert.equal(settings.theme, theme.id);
    assert.ok(
      require('node:fs').existsSync(
        require('node:path').join(__dirname, '..', 'public', theme.artwork),
      ),
    );
  }
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, theme: 'arctic' }).theme, 'abyss');
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, theme: '../unexpected' }).theme, 'rider');
});

test('额度保留动态窗口、多个桶；缺失额度不当作零', () => {
  const buckets = normalizeRateLimits(
    {
      rateLimitsByLimitId: {
        alpha: {
          limitName: 'Alpha',
          primary: { usedPercent: 38, windowDurationMins: 300, resetsAt: 1792000000 },
          secondary: null,
        },
        beta: {
          primary: { usedPercent: null },
          secondary: { usedPercent: 110, windowDurationMins: 10080, resetsAt: null },
        },
      },
    },
    1000,
  );
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].remainingPercent, 62);
  assert.equal(buckets[0].resetsAt, 1792000000000);
  assert.equal(buckets[1].remainingPercent, 0);
  assert.equal(buckets[1].resetsAt, null);
  assert.deepEqual(normalizeRateLimits({ rateLimits: null }), []);
  assert.equal(
    normalizeRateLimits({ rateLimits: { primary: { usedPercent: 0 } } })[0].remainingPercent,
    100,
  );
});

test('流量解析合并接口，忽略空白、非有限数字与畸形采样', () => {
  assert.deepEqual(
    extractPoints({
      data: {
        result: [
          null,
          {
            values: [[2, '1'], [1, '2'], [3, 'NaN'], [4, ''], [5, null], [6, -1], [7, '  '], null],
          },
          { value: [2, '3'] },
        ],
      },
    }),
    [
      { timestamp: 1000, mbps: 2 },
      { timestamp: 2000, mbps: 4 },
    ],
  );
  assert.deepEqual(extractPoints({ data: { result: 'bad' } }), []);
});

test('没有凭据时不请求，缺少方向时不伪造零速率', async () => {
  let called = false;
  const empty = await digitalOceanTraffic(DEFAULT_SETTINGS, '', () => {
    called = true;
  });
  assert.equal(empty.status, 'unconfigured');
  assert.equal(called, false);
  assert.equal(empty.inbound, null);
  const now = Math.floor(Date.now() / 1000);
  const result = await digitalOceanTraffic(configured, 'test-only', async (url) =>
    response(url.includes('direction=inbound') ? [[now, '12']] : []),
  );
  assert.equal(result.status, 'unavailable');
  assert.equal(result.outbound, null);
});

test('流量明确区分近期样本与过期样本，请求只发往 DO', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = await digitalOceanTraffic(configured, 'test-only', async (url, opts) => {
    assert.equal(new URL(url).origin, 'https://api.digitalocean.com');
    assert.equal(opts.headers.Authorization, 'Bearer test-only');
    return response([[now, '9.5']]);
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.inbound, 9.5);
  assert.equal(result.cumulative, null);
  const old = await digitalOceanTraffic(configured, 'test-only', async () =>
    response([[now - 600, '1']]),
  );
  assert.equal(old.status, 'stale');
});

test('HTTP 鉴权与限流错误提供可操作状态，不带 Token', async () => {
  for (const [status, pattern] of [
    [401, /Token 无效/],
    [403, /monitoring:read/],
    [429, /限流/],
    [500, /HTTP 500/],
  ]) {
    await assert.rejects(
      digitalOceanTraffic(configured, 'private-test-token', async () => ({
        ok: false,
        status,
        headers: new Headers({ 'retry-after': '120' }),
      })),
      (error) => {
        assert.match(error.message, pattern);
        assert.ok(!error.message.includes('private-test-token'));
        if (status === 429) assert.equal(error.retryAfter, 120);
        return true;
      },
    );
  }
});

test('趋势预测拒绝样本不足、跨重置、倒退与长时间断档', () => {
  const now = Date.now(),
    bucket = { id: 'codex:primary', resetsAt: now + 7200000, remainingPercent: 60 };
  const samples = [0, 1, 2].map((i) => ({
    ...bucket,
    sampledAt: now - 600000 + i * 300000,
    usedPercent: 30 + i * 5,
  }));
  assert.equal(forecastQuota(samples, bucket, now), now + 3600000);
  assert.equal(forecastQuota(samples.slice(0, 2), bucket, now), null);
  assert.equal(forecastQuota(samples, { ...bucket, resetsAt: bucket.resetsAt + 1 }, now), null);
  assert.equal(
    forecastQuota([samples[0], { ...samples[1], usedPercent: 20 }, samples[2]], bucket, now),
    null,
  );
  assert.equal(
    forecastQuota(
      [{ ...samples[0], sampledAt: now - 1800000 }, samples[1], samples[2]],
      bucket,
      now,
    ),
    null,
  );
  assert.equal(forecastQuota(samples, { ...bucket, resetsAt: now - 1 }, now), null);
});

test('网站与 CLI 设置验证阻止带凭据网址、任意脚本路径', () => {
  for (const url of ['http://github.com/', 'javascript:alert(1)', 'https://user:pass@github.com/'])
    assert.throws(() =>
      validateSettings({ ...DEFAULT_SETTINGS, websites: [{ name: 'Test', url }] }),
    );
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, codexPath: process.execPath }));
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, digitalOcean: { dropletId: '123;bad' } }),
  );
  const clean = validateSettings({
    ...DEFAULT_SETTINGS,
    refreshSeconds: 1,
    digitalOcean: { dropletId: ' 123 ' },
    websites: [{ name: ' GitHub ', url: 'https://github.com' }],
  });
  assert.equal(clean.refreshSeconds, 30);
  assert.equal(clean.websites[0].url, 'https://github.com/');
  assert.equal(clean.digitalOcean.tokenConfigured, false);
});

test('App Server 只执行账户与额度读取，清理子进程并排除邮箱', async () => {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const methods = [];
  let killed = false;
  child.kill = () => {
    killed = true;
    queueMicrotask(() => child.emit('close', 0));
  };
  let input = '';
  child.stdin.on('data', (chunk) => {
    input += chunk;
    let end;
    while ((end = input.indexOf('\n')) >= 0) {
      const message = JSON.parse(input.slice(0, end));
      input = input.slice(end + 1);
      methods.push(message.method);
      if (message.id)
        queueMicrotask(() =>
          child.stdout.write(
            JSON.stringify({
              id: message.id,
              result:
                message.method === 'account/read'
                  ? { account: { type: 'chatgpt', planType: 'pro', email: 'private@example.com' } }
                  : message.method === 'account/rateLimits/read'
                    ? {
                        rateLimits: {
                          primary: {
                            usedPercent: 15,
                            windowDurationMins: 300,
                            resetsAt: 1792000000,
                          },
                        },
                      }
                    : {},
            }) + '\n',
          ),
        );
    }
  });
  const result = await codexQuota('', { discover: () => '/mock/codex', spawn: () => child });
  assert.deepEqual(methods, [
    'initialize',
    'initialized',
    'account/read',
    'account/rateLimits/read',
  ]);
  assert.equal(result.status, 'ready');
  assert.equal(killed, true);
  assert.ok(!JSON.stringify(result).includes('private@example.com'));
});

test('演示快照始终标注演示，默认实机设置不开演示', () => {
  assert.equal(DEFAULT_SETTINGS.demoMode, false);
  const snapshot = demoSnapshot();
  assert.equal(snapshot.mode, 'demo');
  assert.equal(snapshot.traffic.status, 'demo');
  assert.equal(snapshot.codex.status, 'demo');
});
