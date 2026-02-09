// CodeBlockHeader.ets
import {CopyButton} from './CopyButton'
@Component
export struct CodeBlockHeader {
  @Prop language: string;
  @Prop code: string;
  public onCopy: () => void = () => {};
  public onDownload: () => void = () => {};

  build() {
    Row() {
      Text(this.language)
        .fontColor('#666666')
        .fontSize(12)
        .fontFamily('Monospace')
        .margin({ left: 4 })

      Row({ space: 10 }) {
        CopyButton({ code: this.code })
      }
    }
    .width('100%')
    .height(40)
    .padding({ left: 12, right: 12 })
    .backgroundColor('#F5F5F5')
    .justifyContent(FlexAlign.SpaceBetween)
  }
}