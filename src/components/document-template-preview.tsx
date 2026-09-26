'use client';

import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_TEXT_STYLE_PRESETS,
  type DocumentTextStylePresetId,
} from './document-text-style-presets';
import './document-preview-templates.css';
import { FitZoomFrame, PaperPage } from './document-preview-zoom';
import { paperSizeOf } from '@/lib/paper-sizes';

export function DocumentTextStyleToolbar({
  value,
  onChange,
}: {
  value: DocumentTextStylePresetId;
  onChange: (id: DocumentTextStylePresetId) => void;
}) {
  const current =
    DOCUMENT_TEXT_STYLE_PRESETS.find((p) => p.id === value) ??
    DOCUMENT_TEXT_STYLE_PRESETS[0];

  return (
    <div className="rounded-xl border-2 border-matsu-500/35 bg-gradient-to-br from-matsu-50/90 to-white p-4 shadow-sm ring-1 ring-matsu-500/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-matsu-600 text-white shrink-0">
          <Type className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-sumi-900 leading-tight">
            文字の見た目
          </h4>
          <p className="text-[11px] text-sumi-500 leading-snug mt-0.5">
            紙と、印刷したときの文字のバランスが変わります
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="テキストの種"
      >
        {DOCUMENT_TEXT_STYLE_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={value === p.id ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-9 min-h-9 px-3 text-xs font-medium rounded-lg transition-all',
              value === p.id &&
                'bg-matsu-600 hover:bg-matsu-700 shadow-sm ring-2 ring-matsu-600/30'
            )}
            onClick={() => onChange(p.id)}
            aria-pressed={value === p.id}
            aria-label={p.label}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <p className="text-[11px] text-sumi-600 mt-3 leading-relaxed border-t border-sumi-100 pt-3">
        {current.description}
      </p>
    </div>
  );
}

export interface InvoicePreviewItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

function formatYen(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('ja-JP').format(amount);
}

/** 月に応じた既定の時候の挨拶 */
function getDefaultSeasonGreeting(date: Date = new Date()): string {
  const m = date.getMonth() + 1;
  const table: Record<number, string> = {
    1: '厳寒の候',
    2: '晩冬の候',
    3: '早春の候',
    4: '春暖の候',
    5: '新緑の候',
    6: '初夏の候',
    7: '盛夏の候',
    8: '残暑の候',
    9: '初秋の候',
    10: '秋涼の候',
    11: '晩秋の候',
    12: '師走の候',
  };
  return table[m] ?? '時下';
}

/** 「◯◯の候」のよく使われる候補 */
const SEASON_GREETING_PRESETS = [
  '厳寒の候',
  '晩冬の候',
  '早春の候',
  '春暖の候',
  '陽春の候',
  '新緑の候',
  '初夏の候',
  '梅雨の候',
  '盛夏の候',
  '残暑の候',
  '初秋の候',
  '秋涼の候',
  '晩秋の候',
  '師走の候',
];

interface InvoiceLivePreviewProps {
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
  textStylePreset: DocumentTextStylePresetId;
  onTextStyleChange: (id: DocumentTextStylePresetId) => void;
  /** 旧請求書互換：現状の護持費のお知らせレイアウトでは未使用 */
  invoiceItems?: InvoicePreviewItem[];
  onItemChange?: (
    index: number,
    field: keyof InvoicePreviewItem,
    value: string
  ) => void;
  onAddItem?: () => void;
  onRemoveItem?: (index: number) => void;
  subtotal?: number;
  tax?: number;
  total?: number;
}

/**
 * 「護持費のお知らせ」レイアウトで、その場で編集できるプレビュー。
 * 下線付きテキストボックスで
 *  - 左上の宛名
 *  - 中央の宛名
 *  - 護持費の更新年数（◯年分）
 *  - お支払金額
 *  - 次回お預かり日
 * を編集可能。
 */
export function InvoiceLivePreview({
  templateData,
  onTemplateDataChange,
  textStylePreset,
}: InvoiceLivePreviewProps) {
  const customerName = templateData.customerName || '';
  const yearCount = templateData.yearCount || '';
  const amountStr = templateData.amount || '';
  const nextNoticeDate = templateData.nextNoticeDate || '';
  const seasonGreeting =
    templateData.seasonGreeting || getDefaultSeasonGreeting();

  const amountNum = parseFloat(amountStr);
  const amountDisplay = Number.isFinite(amountNum) ? formatYen(amountNum) : '';
  const paper = paperSizeOf(templateData.paperSize);

  return (
    <div className="space-y-4">
      <FitZoomFrame>
      <PaperPage widthMm={paper.widthMm} heightMm={paper.heightMm}>
      <div
        className={cn(
          'komine-invoice-preview overflow-hidden',
          textStylePreset !== 'default' && `doc-preset-${textStylePreset}`
        )}
      >
        <div className="notice-container">
          {/* 左上の宛名 */}
          <div className="top-recipient">
            <input
              type="text"
              className="notice-editable name-input"
              value={customerName}
              onChange={(e) =>
                onTemplateDataChange('customerName', e.target.value)
              }
              placeholder="宛名"
              aria-label="宛名（左上）"
            />
            <span>様</span>
          </div>

          <h1 className="notice-title">護 持 費 の お 知 ら せ</h1>

          <div className="greeting">
            <p className="inline-flex flex-wrap items-baseline gap-1">
              <span>拝啓&nbsp;</span>
              <input
                type="text"
                className="notice-editable season-input"
                list="season-greeting-presets"
                value={seasonGreeting}
                onChange={(e) =>
                  onTemplateDataChange('seasonGreeting', e.target.value)
                }
                placeholder="早春の候"
                aria-label="時候の挨拶（例：早春の候）"
              />
              <datalist id="season-greeting-presets">
                {SEASON_GREETING_PRESETS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <span>、貴家におかれましては益々ご健勝のこととお慶び申し上げます。</span>
            </p>
            <p>平素はひとかたならぬご厚情を賜り心よりお礼申し上げます。</p>
            <p>
              さて表題の件につきましてご案内いたしますので、何卒よろしくお願い致します。
            </p>
          </div>

          <div className="keigu">敬具</div>

          {/* 中央の宛名（再掲） */}
          <div className="statement">
            <span>この度、</span>
            <input
              type="text"
              className="notice-editable name-input-mid"
              value={customerName}
              onChange={(e) =>
                onTemplateDataChange('customerName', e.target.value)
              }
              placeholder="宛名"
              aria-label="宛名（本文中）"
            />
            <span>様の今回のお支払金額をお知らせ致します。</span>
          </div>

          <div className="payment-block">
            <div className="payment-row">
              <span>護持費の更新として</span>
              <input
                type="text"
                inputMode="numeric"
                className="notice-editable field-num-input"
                value={yearCount}
                onChange={(e) =>
                  onTemplateDataChange('yearCount', e.target.value)
                }
                placeholder="1"
                aria-label="更新年数"
              />
              <span>年分</span>
            </div>
            <div className="payment-row">
              <span>お支払は</span>
              <span>￥</span>
              <input
                type="text"
                inputMode="numeric"
                className="notice-editable field-amount-input"
                value={amountStr}
                onChange={(e) =>
                  onTemplateDataChange(
                    'amount',
                    e.target.value.replace(/[^\d.]/g, '')
                  )
                }
                placeholder="10000"
                aria-label="お支払金額"
              />
              <span>となります。</span>
            </div>
            {amountDisplay && (
              <div className="text-xs text-sumi-500 pl-1">
                表示: ￥ {amountDisplay}
              </div>
            )}
          </div>

          <div className="note-line">
            尚、次回の
            <input
              type="text"
              className="notice-editable field-date-input"
              value={nextNoticeDate}
              onChange={(e) =>
                onTemplateDataChange('nextNoticeDate', e.target.value)
              }
              placeholder="2026年12月31日"
              aria-label="次回お預かり日"
            />
            には、{yearCount || '◯'}
            年間分をお預かり致しますので、よろしくお願い申し上げます。
          </div>

          <ul className="bullet-list">
            <li>お支払方法は別紙金融機関をご利用下さい。</li>
            <li>
              又、ご不明な点は、小嶺霊園
              管理事務所へお問い合わせ下さいませ。
            </li>
          </ul>

          <div className="signature">
            <div className="org">宗教法人　長谷寺</div>
            <div className="org">黒崎小嶺霊園　管理事務所</div>
            <div className="tel">TEL　093-613-3868</div>
            <div className="tel">FAX　093-613-3893</div>
          </div>
        </div>
      </div>
      </PaperPage>
      </FitZoomFrame>
    </div>
  );
}

interface PostcardLivePreviewProps {
  templateData: Record<string, string>;
  onTemplateDataChange: (key: string, value: string) => void;
  textStylePreset: DocumentTextStylePresetId;
  onTextStyleChange: (id: DocumentTextStylePresetId) => void;
}

/**
 * はがきPDF（宛先面）テンプレートに近いレイアウトで、その場編集できるプレビュー
 */
export function PostcardLivePreview({
  templateData,
  onTemplateDataChange,
  textStylePreset,
}: PostcardLivePreviewProps) {
  return (
    <div className="space-y-4">
      <FitZoomFrame>
      <div
        className={cn(
          'komine-postcard-preview rounded border border-sumi-200 shadow-sm flex justify-center bg-sumi-100 p-4',
          textStylePreset !== 'default' && `doc-preset-${textStylePreset}`
        )}
      >
      <div className="postcard-container address-side bg-white shadow">
        <div className="postal-code-area">
          <div className="postal-code">
            <span className="prefix">〒</span>
            <input
              type="text"
              className="preview-input border-0 flex-1 min-w-0 text-right font-bold tracking-wider"
              style={{ fontSize: '16px', letterSpacing: '0.25em' }}
              value={templateData.recipientPostalCode || ''}
              onChange={(e) =>
                onTemplateDataChange('recipientPostalCode', e.target.value)
              }
              placeholder="123-4567"
              aria-label="宛先郵便番号（プレビュー）"
            />
          </div>
        </div>

        <div className="recipient-area">
          <div className="recipient-address">
            <textarea
              className="preview-textarea text-[11px] leading-relaxed"
              value={templateData.recipientAddress || ''}
              onChange={(e) =>
                onTemplateDataChange('recipientAddress', e.target.value)
              }
              placeholder="住所"
              rows={4}
              aria-label="宛先住所（プレビュー）"
            />
          </div>
          <div className="recipient-name-row">
            <input
              type="text"
              className="preview-input text-center font-bold flex-1 min-w-0 max-w-[85%]"
              style={{ fontSize: '18px' }}
              value={templateData.recipientName || ''}
              onChange={(e) =>
                onTemplateDataChange('recipientName', e.target.value)
              }
              placeholder="宛名"
              aria-label="宛名（プレビュー）"
            />
            <span className="suffix">様</span>
          </div>
        </div>

        <div className="sender-area">
          <div className="sender-postal-code">
            <span>〒</span>
            <input
              type="text"
              className="preview-input inline-block w-auto min-w-[6rem] flex-1 text-[10px]"
              value={templateData.senderPostalCode || ''}
              onChange={(e) =>
                onTemplateDataChange('senderPostalCode', e.target.value)
              }
              placeholder="差出人郵便番号"
              aria-label="差出人郵便番号（プレビュー）"
            />
          </div>
          <div className="sender-address">
            <textarea
              className="preview-textarea text-[9px] leading-snug min-h-[2.5rem]"
              value={templateData.senderAddress || ''}
              onChange={(e) =>
                onTemplateDataChange('senderAddress', e.target.value)
              }
              placeholder="差出人住所"
              rows={2}
              aria-label="差出人住所（プレビュー）"
            />
          </div>
          <div className="sender-name">
            <input
              type="text"
              className="preview-input font-bold text-[11px]"
              value={templateData.senderName || ''}
              onChange={(e) =>
                onTemplateDataChange('senderName', e.target.value)
              }
              placeholder="差出人名"
              aria-label="差出人名（プレビュー）"
            />
          </div>
        </div>
      </div>
    </div>
      </FitZoomFrame>
    </div>
  );
}
