!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
Var AstraDesktopCheckbox
Var AstraDesktopChoice
LangString AstraOptionsTitle 1033 "Installation options"
LangString AstraOptionsTitle 2052 "安装选项"
LangString AstraOptionsSubtitle 1033 "Choose how to access AstraDesk."
LangString AstraOptionsSubtitle 2052 "选择 AstraDesk 的启动入口。"
LangString AstraDesktopLabel 1033 "Create a desktop shortcut"
LangString AstraDesktopLabel 2052 "在桌面创建快捷方式"
LangString AstraOptionsNote 1033 "A Start menu shortcut is always created. Settings are kept when upgrading or uninstalling."
LangString AstraOptionsNote 2052 "始终创建开始菜单入口。升级或普通卸载会保留个人配置。"

!macro customInit
  StrCpy $AstraDesktopChoice ${BST_CHECKED}
  ${GetParameters} $R0
  ${GetOptions} $R0 "--no-desktop-shortcut" $R1
  ${IfNot} ${Errors}
    StrCpy $AstraDesktopChoice ${BST_UNCHECKED}
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom AstraOptionsPage AstraOptionsLeave

Function AstraOptionsPage
  ${If} ${isUpdated}
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "$(AstraOptionsTitle)" "$(AstraOptionsSubtitle)"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateCheckbox} 0 12u 100% 18u "$(AstraDesktopLabel)"
  Pop $AstraDesktopCheckbox
  ${NSD_SetState} $AstraDesktopCheckbox $AstraDesktopChoice
  ${NSD_CreateLabel} 0 42u 100% 48u "$(AstraOptionsNote)"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function AstraOptionsLeave
  ${NSD_GetState} $AstraDesktopCheckbox $AstraDesktopChoice
FunctionEnd
!macroend

!macro customInstall
  ${If} ${isUpdated}
    ; Preserve a user's shortcut decision on unattended updates.
  ${ElseIf} $AstraDesktopChoice == ${BST_CHECKED}
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${Else}
    Delete "$newDesktopLink"
  ${EndIf}
!macroend
!endif

!macro customUnInstall
  ${IfNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AstraDesk"
  ${EndIf}
  ${IfNot} ${isKeepShortcuts}
    Delete "$DESKTOP\AstraDesk.lnk"
  ${EndIf}
!macroend
