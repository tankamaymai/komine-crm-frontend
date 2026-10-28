import { render, screen } from '@testing-library/react';

import { PermitLivePreview } from '@/components/permit-live-preview';

// 1文字 = 文字の大きさ1つ分の幅として測る
jest.mock('@/lib/permit-text-measure', () => ({
  measureTextPt: (text: string, fontSizePt: number) => Array.from(text).length * fontSizePt,
  useFontsReadyVersion: () => 1,
  permitPrintFont: { className: 'font-print', style: { fontFamily: 'Noto Sans JP' } },
}));

describe('許可証プレビューのはみ出し確認', () => {
  it('欄の上に「本籍（1列目）」などの名前を出さない', () => {
    render(<PermitLivePreview templateData={{}} onTemplateDataChange={jest.fn()} />);
    expect(screen.queryByText('本籍（1列目）')).not.toBeInTheDocument();
    expect(screen.queryByText('使用者名（殿）')).not.toBeInTheDocument();
    // 入力欄としては名前で探せる
    expect(screen.getByLabelText('本籍（1列目）')).toBeInTheDocument();
  });

  it('収まっているときは、はみ出しのお知らせを出さない', () => {
    render(
      <PermitLivePreview
        templateData={{ registeredAddress: '福岡県中間市通谷' }}
        onTemplateDataChange={jest.fn()}
      />
    );
    expect(screen.getByLabelText('本籍（1列目）')).toHaveAttribute('data-overflow', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('台紙の線を越える長さなら、その欄を赤くしてお知らせを出す', () => {
    render(
      <PermitLivePreview
        templateData={{ registeredAddress: '福岡県北九州市八幡西区小峰一丁目二番三号' }}
        onTemplateDataChange={jest.fn()}
      />
    );
    expect(screen.getByLabelText('本籍（1列目）')).toHaveAttribute('data-overflow', 'true');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('はみ出し');
    expect(alert).toHaveTextContent('本籍（1列目）');
  });

  it('はみ出した文字も切らずに全部見せる（欄が文字の長さまで伸びる）', () => {
    const long = '福岡県北九州市八幡西区小峰一丁目二番三号';
    render(
      <PermitLivePreview
        templateData={{ registeredAddress: long }}
        onTemplateDataChange={jest.fn()}
      />
    );
    const input = screen.getByLabelText('本籍（1列目）');
    const box = input.parentElement as HTMLElement;
    const widthPx = parseFloat(box.style.width);
    const fontPx = parseFloat(box.style.fontSize);
    expect(widthPx).toBeGreaterThanOrEqual(Array.from(long).length * fontPx);
  });
});
