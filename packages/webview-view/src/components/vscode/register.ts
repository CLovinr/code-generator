// https://github.com/microsoft/vscode-webview-ui-toolkit
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeTextField,
  vsCodeTextArea,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeRadio,
  vsCodeRadioGroup,
  vsCodeDivider,
  vsCodeDataGrid,
  vsCodeDataGridRow,
  vsCodeDataGridCell,
  vsCodePanels,
  vsCodePanelView,
  vsCodePanelTab,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeTextField(),
  vsCodeTextArea(),
  vsCodeDropdown(),
  vsCodeOption(),
  vsCodeRadio(),
  vsCodeRadioGroup(),
  vsCodeDivider(),
  vsCodeDataGrid(),
  vsCodeDataGridRow(),
  vsCodeDataGridCell(),
  vsCodePanels(),
  vsCodePanelView(),
  vsCodePanelTab()
);
