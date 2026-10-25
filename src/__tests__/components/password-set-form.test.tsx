import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PasswordSetForm } from '@/components/password-set-form'

const pushMock = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: pushMock }),
  useSearchParams: () => mockSearchParams,
}))

const resetPasswordMock = jest.fn()
jest.mock('@/lib/api/auth', () => ({
  resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
}))

describe('PasswordSetForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    resetPasswordMock.mockReset()
    mockSearchParams = new URLSearchParams()
    window.location.hash = ''
  })

  describe('コードなしの場合', () => {
    it('set モード: 招待リンク無効メッセージを表示し、フォームは出さない', () => {
      render(<PasswordSetForm mode="set" />)
      expect(
        screen.getByText('招待リンクが無効です。管理者に招待メールの再送をご依頼ください。')
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('新しいパスワード')).not.toBeInTheDocument()
    })

    it('reset モード: リセットリンク無効メッセージを表示する', () => {
      render(<PasswordSetForm mode="reset" />)
      expect(
        screen.getByText('リセットリンクが無効です。再度パスワードリセットをお試しください。')
      ).toBeInTheDocument()
    })

    it('初回レンダー時に一瞬でもフォームがフラッシュしない（validCode初期化）', () => {
      const { container } = render(<PasswordSetForm mode="set" />)
      // エラーメッセージと同時にフォームがDOMに存在しないこと
      expect(container.querySelector('form')).toBeNull()
    })
  })

  describe('有効なコードがある場合', () => {
    beforeEach(() => {
      mockSearchParams = new URLSearchParams({ code: 'valid-code-123' })
    })

    it('パスワード入力フォームが表示される', () => {
      render(<PasswordSetForm mode="set" />)
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument()
    })

    it('8文字未満でsubmitするとvalidationエラー', async () => {
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abc1')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abc1')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      expect(
        screen.getByText('パスワードは8文字以上である必要があります')
      ).toBeInTheDocument()
      expect(resetPasswordMock).not.toHaveBeenCalled()
    })

    it('大文字・小文字・数字を含まないとvalidationエラー', async () => {
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'password')
      await user.type(screen.getByLabelText('パスワード確認'), 'password')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      expect(
        screen.getByText('パスワードは大文字、小文字、数字を含む必要があります')
      ).toBeInTheDocument()
    })

    it('パスワード不一致でvalidationエラー', async () => {
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef13')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })

    it('有効なパスワードでresetPassword APIを呼び出す', async () => {
      resetPasswordMock.mockResolvedValue({ success: true, data: {} })
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef12')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith(
          { accessToken: undefined, code: 'valid-code-123' },
          'Abcdef12',
          'Abcdef12'
        )
      })
    })

    it('成功時に「設定完了」画面へ遷移する', async () => {
      resetPasswordMock.mockResolvedValue({ success: true, data: {} })
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef12')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      await waitFor(() => {
        expect(screen.getByText('設定完了')).toBeInTheDocument()
      })
    })

    it('INVALID_TOKEN エラーで期限切れヒントを表示（set モード）', async () => {
      resetPasswordMock.mockResolvedValue({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '認証コードが無効または期限切れです' },
      })
      const user = userEvent.setup()
      render(<PasswordSetForm mode="set" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef12')
      await user.click(screen.getByRole('button', { name: 'パスワードを設定' }))

      await waitFor(() => {
        expect(screen.getByText(/招待リンクの有効期限が切れている/)).toBeInTheDocument()
      })
    })

    it('INVALID_TOKEN エラーで再実行CTAを表示（reset モード）', async () => {
      resetPasswordMock.mockResolvedValue({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '認証コードが無効または期限切れです' },
      })
      const user = userEvent.setup()
      render(<PasswordSetForm mode="reset" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef12')
      await user.click(screen.getByRole('button', { name: 'パスワードを再設定' }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'パスワードリセットをやり直す' })
        ).toBeInTheDocument()
      })
    })
  })

  describe('ハッシュに access_token がある場合（implicit フロー）', () => {
    beforeEach(() => {
      window.location.hash =
        '#access_token=hash-token-abc&refresh_token=r1&expires_in=3600&type=recovery'
    })
    afterEach(() => {
      window.location.hash = ''
    })

    it('パスワード入力フォームが表示される', () => {
      render(<PasswordSetForm mode="reset" />)
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument()
    })

    it('access_token を credentials として resetPassword に渡す', async () => {
      resetPasswordMock.mockResolvedValue({ success: true, data: {} })
      const user = userEvent.setup()
      render(<PasswordSetForm mode="reset" />)

      await user.type(screen.getByLabelText('新しいパスワード'), 'Abcdef12')
      await user.type(screen.getByLabelText('パスワード確認'), 'Abcdef12')
      await user.click(screen.getByRole('button', { name: 'パスワードを再設定' }))

      await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith(
          { accessToken: 'hash-token-abc', code: undefined },
          'Abcdef12',
          'Abcdef12'
        )
      })
    })

    it('読み込み後トークンをURLハッシュから除去する', async () => {
      render(<PasswordSetForm mode="reset" />)
      await waitFor(() => {
        expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      })
      // access_token を履歴・アドレスバーに残さない
      expect(window.location.hash).toBe('')
    })
  })

  describe('期限切れ・無効リンク（ハッシュに #error=...）の場合', () => {
    beforeEach(() => {
      window.location.hash =
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    })
    afterEach(() => {
      window.location.hash = ''
    })

    it('reset モード: フォームを出さず、期限切れヒントと「やり直す」CTAを表示する', () => {
      render(<PasswordSetForm mode="reset" />)
      expect(screen.queryByLabelText('新しいパスワード')).not.toBeInTheDocument()
      expect(screen.getByText(/リセットリンクの有効期限が切れている/)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'パスワードリセットをやり直す' })
      ).toBeInTheDocument()
    })

    it('set モード: フォームを出さず、招待リンクの期限切れヒントを表示する', () => {
      render(<PasswordSetForm mode="set" />)
      expect(screen.queryByLabelText('新しいパスワード')).not.toBeInTheDocument()
      expect(screen.getByText(/招待リンクの有効期限が切れている/)).toBeInTheDocument()
    })
  })
})
