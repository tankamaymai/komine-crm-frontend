'use client';

/**
 * お支払い方法のご案内ライブプレビュー
 * HTML テンプレート (payment-guide.html) と同じ見た目で、
 * 編集可能なフィールドを重ねたプレビュー。
 */

import { cn } from '@/lib/utils';
import { type DocumentTextStylePresetId } from './document-text-style-presets';
import './document-preview-templates.css';
import { FitZoomFrame, PaperPage } from './document-preview-zoom';
import { paperSizeOf } from '@/lib/paper-sizes';

export const PAYMENT_GUIDE_DEFAULTS: Record<string, string> = {
  option1: '当霊園事務所へご持参下さい。',
  option2: '又は、下記の銀行か郵便局へお振込み下さい。',
  notice1:
    'お振込の場合の振込手数料はお客様の負担となりますので、ご了承下さいませ。',
  notice2:
    'お振込みの場合、当園からの領収書は発行されませんので、金融機関の受領書を大切に保管されて下さい。',
  notice3: 'お振込みの際、名義人様のお名前を必ず記載してください。',
  bank1Name: '福岡ひびき信用金庫 町上津役支店',
  bank1AccountType: '普通',
  bank1AccountNumber: '1165176',
  bank2Name: 'ゆうちょ銀行',
  bank2Symbol: '17470',
  bank2Number: '63945001',
  orgName: '長谷寺',
  orgNameKana: 'はせじ',
  repName: '渡辺 祐昭',
  repNameKana: 'わたなべ ゆうしょう',
  cemeteryName: '黒崎小嶺霊園',
  tel: '093-613-3868',
  fax: '093-613-3893',
};

interface PaymentGuideLivePreviewProps {
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
  textStylePreset: DocumentTextStylePresetId;
  onTextStyleChange: (id: DocumentTextStylePresetId) => void;
}

/** プレビュー用 input: シンプルに下線風 */
function EditableInput({
  value,
  placeholder,
  onChange,
  ariaLabel,
  className,
  multiline = false,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  className?: string;
  multiline?: boolean;
}) {
  const common = cn(
    'bg-white/60 border border-dashed border-sumi/25 rounded-[3px] px-1.5 py-0.5 outline-none focus:bg-ai/5 focus:border-ai focus:border-solid focus:ring-2 focus:ring-ai/20 text-inherit font-inherit',
    className
  );
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(common, 'w-full resize-y min-h-[2.5em] leading-relaxed')}
        rows={2}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(common)}
    />
  );
}

/**
 * お支払い方法のご案内 プレビュー（HTML テンプレートと同じ見た目）
 */
export function PaymentGuideLivePreview({
  templateData,
  onTemplateDataChange,
  textStylePreset,
}: PaymentGuideLivePreviewProps) {
  const v = (key: string) =>
    templateData[key] ?? PAYMENT_GUIDE_DEFAULTS[key] ?? '';
  const paper = paperSizeOf(templateData.paperSize);

  return (
    <div className="space-y-3">
      <FitZoomFrame>
      <PaperPage widthMm={paper.widthMm} heightMm={paper.heightMm}>
      <div
        className={cn(
          'komine-payment-preview overflow-hidden',
          textStylePreset !== 'default' && `doc-preset-${textStylePreset}`
        )}
      >
        <div className="guide-container">
          <div className="top-title">お客様各位</div>

          <div className="section-heading">管理料のお支払い方法として</div>
          <div className="section-body">
            <ol className="ordered">
              <li>
                <EditableInput
                  value={v('option1')}
                  onChange={(x) => onTemplateDataChange('option1', x)}
                  placeholder="当霊園事務所へご持参下さい。"
                  ariaLabel="お支払い方法 ①"
                  className="flex-1 min-w-[220px]"
                />
              </li>
              <li>
                <EditableInput
                  value={v('option2')}
                  onChange={(x) => onTemplateDataChange('option2', x)}
                  placeholder="又は、下記の銀行か郵便局へお振込み下さい。"
                  ariaLabel="お支払い方法 ②"
                  className="flex-1 min-w-[260px]"
                />
              </li>
            </ol>

            <div className="notices">
              <div className="note">
                <span>※</span>
                <EditableInput
                  value={v('notice1')}
                  onChange={(x) => onTemplateDataChange('notice1', x)}
                  ariaLabel="注意事項 1"
                  multiline
                  className="flex-1"
                />
              </div>
              <div className="note">
                <span>※</span>
                <EditableInput
                  value={v('notice2')}
                  onChange={(x) => onTemplateDataChange('notice2', x)}
                  ariaLabel="注意事項 2"
                  multiline
                  className="flex-1"
                />
              </div>
              <div className="note">
                <span>※</span>
                <EditableInput
                  value={v('notice3')}
                  onChange={(x) => onTemplateDataChange('notice3', x)}
                  ariaLabel="注意事項 3"
                  multiline
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="section-heading">お振り込み先</div>
          <div className="section-body">
            <div className="bank-list">
              {/* 金融機関 1 */}
              <div className="bank-item">
                <div className="bank-header">
                  <span>・</span>
                  <EditableInput
                    value={v('bank1Name')}
                    onChange={(x) => onTemplateDataChange('bank1Name', x)}
                    ariaLabel="金融機関1 名称"
                    className="min-w-[220px]"
                  />
                  <span className="ml-2 inline-flex items-center gap-1">
                    <EditableInput
                      value={v('bank1AccountType')}
                      onChange={(x) =>
                        onTemplateDataChange('bank1AccountType', x)
                      }
                      ariaLabel="口座種別"
                      className="w-[70px]"
                    />
                    <EditableInput
                      value={v('bank1AccountNumber')}
                      onChange={(x) =>
                        onTemplateDataChange('bank1AccountNumber', x)
                      }
                      ariaLabel="口座番号"
                      className="w-[130px]"
                    />
                  </span>
                </div>
                <div className="bank-detail">
                  <div className="row">
                    <span className="label">宗教法人</span>
                    <span className="value inline-flex items-baseline gap-2 flex-wrap">
                      <EditableInput
                        value={v('orgName')}
                        onChange={(x) => onTemplateDataChange('orgName', x)}
                        ariaLabel="宗教法人名"
                        className="min-w-[120px]"
                      />
                      <span className="sub-label">
                        （
                        <input
                          type="text"
                          value={v('orgNameKana')}
                          onChange={(e) =>
                            onTemplateDataChange('orgNameKana', e.target.value)
                          }
                          aria-label="宗教法人 ふりがな"
                          className="bg-transparent border-b border-dashed border-sumi/30 outline-none focus:border-ai text-[11px] w-[90px]"
                        />
                        ）
                      </span>
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">代表役員</span>
                    <span className="value inline-flex items-baseline gap-2 flex-wrap">
                      <EditableInput
                        value={v('repName')}
                        onChange={(x) => onTemplateDataChange('repName', x)}
                        ariaLabel="代表役員名"
                        className="min-w-[140px]"
                      />
                      <span className="sub-label">
                        （
                        <input
                          type="text"
                          value={v('repNameKana')}
                          onChange={(e) =>
                            onTemplateDataChange('repNameKana', e.target.value)
                          }
                          aria-label="代表役員 ふりがな"
                          className="bg-transparent border-b border-dashed border-sumi/30 outline-none focus:border-ai text-[11px] w-[140px]"
                        />
                        ）
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 金融機関 2（ゆうちょ） */}
              <div className="bank-item">
                <div className="bank-header">
                  <span>・</span>
                  <EditableInput
                    value={v('bank2Name')}
                    onChange={(x) => onTemplateDataChange('bank2Name', x)}
                    ariaLabel="金融機関2 名称"
                    className="min-w-[160px]"
                  />
                </div>
                <div className="bank-detail">
                  <div className="row">
                    <span className="label">記号</span>
                    <span className="value">
                      <EditableInput
                        value={v('bank2Symbol')}
                        onChange={(x) =>
                          onTemplateDataChange('bank2Symbol', x)
                        }
                        ariaLabel="ゆうちょ 記号"
                        className="w-[140px]"
                      />
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">番号</span>
                    <span className="value">
                      <EditableInput
                        value={v('bank2Number')}
                        onChange={(x) =>
                          onTemplateDataChange('bank2Number', x)
                        }
                        ariaLabel="ゆうちょ 番号"
                        className="w-[180px]"
                      />
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">宗教法人</span>
                    <span className="value text-sumi/70">
                      {v('orgName')}（{v('orgNameKana')}）
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">代表役員</span>
                    <span className="value text-sumi/70">
                      {v('repName')}（{v('repNameKana')}）
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-notice">
            <div>※分割でのお支払いも可能です。</div>
            <div>
              <span className="highlight">
                以前分納をご利用されていた方も改めてお手続きが必要です。
              </span>
            </div>
            <div>
              <span className="highlight">
                印鑑をご持参の上管理事務所までお越しください。
              </span>
            </div>
            <div className="ml-2">ご不明な点はお問い合わせ下さいませ。</div>
          </div>

          <div className="signature">
            <div className="org-name inline-flex items-baseline gap-1">
              <EditableInput
                value={v('cemeteryName')}
                onChange={(x) => onTemplateDataChange('cemeteryName', x)}
                ariaLabel="霊園名"
                className="min-w-[140px]"
              />
              <span>　管理事務所</span>
            </div>
            <div className="tel inline-flex items-baseline gap-1">
              <span>TEL</span>
              <EditableInput
                value={v('tel')}
                onChange={(x) => onTemplateDataChange('tel', x)}
                ariaLabel="TEL"
                className="min-w-[140px]"
              />
            </div>
            <div className="tel inline-flex items-baseline gap-1">
              <span>FAX</span>
              <EditableInput
                value={v('fax')}
                onChange={(x) => onTemplateDataChange('fax', x)}
                ariaLabel="FAX"
                className="min-w-[140px]"
              />
            </div>
          </div>
        </div>
      </div>
      </PaperPage>
      </FitZoomFrame>
    </div>
  );
}
