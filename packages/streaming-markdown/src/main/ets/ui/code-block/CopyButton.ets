import pasteboard from '@ohos.pasteboard';
import { promptAction } from '@kit.ArkUI';

@Component
export struct CopyButton {
  @Prop code: string;
  @State isCopied: boolean = false;

  copyToClipboard() {
    try {
      const pasteData = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, this.code);
      const systemPasteboard = pasteboard.getSystemPasteboard();
      systemPasteboard.setData(pasteData).then(() => {
        this.isCopied = true;
        promptAction.openToast({ message: '复制成功', duration: 2000 });
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      });
    } catch (err) {
      console.error('Failed to copy: ' + err.message);
    }
  }

  build() {
    Button(this.isCopied ? '✓' : 'Copy')
      .fontSize(12)
      .fontColor(this.isCopied ? Color.Green : '#666666')
      .backgroundColor(Color.Transparent)
      .onClick(() => this.copyToClipboard())
  }
}