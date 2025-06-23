// https://github.com/microsoft/vscode-webview-ui-toolkit
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeTextField,
  vsCodeTextArea,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeRadioGroup,
  vsCodeDivider,
  vsCodeDataGrid,
  vsCodeDataGridRow,
  vsCodeDataGridCell,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeTextField(),
  vsCodeTextArea(),
  vsCodeDropdown(),
  vsCodeOption(),
  vsCodeRadioGroup(),
  vsCodeDivider(),
  vsCodeDataGrid(),
  vsCodeDataGridRow(),
  vsCodeDataGridCell()
);
