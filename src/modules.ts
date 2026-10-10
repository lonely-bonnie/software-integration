import { Activity, Cpu } from 'lucide-react';
import definitions from '../shared/modules.json';
import type { Settings } from './types';

export type ModuleId = keyof Settings['modules'];
export const modules = definitions.map((definition) => ({
  ...definition,
  id: definition.id as ModuleId,
  icon: definition.id === 'traffic' ? Activity : Cpu,
}));
