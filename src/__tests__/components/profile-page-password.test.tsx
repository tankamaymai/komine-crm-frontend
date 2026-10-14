/**
 * ProfilePage パスワード変更フォームのテスト（#229）
 *
 * backend changePasswordSchema は confirmPassword を必須にしているため、
 * フロントが confirmPassword を送らないと常に 400 になる。
 * リクエストに confirmPassword が含まれることを回帰テストで保証する。
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProfilePage from '@/components/profile-page';

const changePasswordMock = jest.fn();
const updateProfileMock = jest.fn();

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'staff-1',
      email: 'test@example.com',
      name: 'テスト太郎',
      role: 'operator',
    },
    changePassword: (...args: unknown[]) => changePasswordMock(...args),
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    isLoading: false,
  }),
}));

jest.mock('@/components/theme-switcher', () => ({
  __esModule: true,
  default: () => null,
}));

describe('ProfilePage パスワード変更 (#229)', () => {
  beforeEach(() => {
    changePasswordMock.mockReset();
    changePasswordMock.mockResolvedValue({ success: true });
  });

  async function fillAndSubmit(current: string, next: string, confirm: string) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('現在のパスワード'), current);
    await user.type(screen.getByLabelText('新しいパスワード'), next);
    await user.type(screen.getByLabelText('新しいパスワード（確認）'), confirm);
    await user.click(screen.getByRole('button', { name: 'パスワードを変更' }));
  }

  it('changePassword に confirmPassword を含めて送信する', async () => {
    render(<ProfilePage onBack={() => {}} />);
    await fillAndSubmit('OldPass123', 'NewPass123', 'NewPass123');

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      });
    });
  });

  it('大文字・小文字・数字を含まないパスワードはサーバに送らず即時エラー', async () => {
    render(<ProfilePage onBack={() => {}} />);
    await fillAndSubmit('OldPass123', 'alllowercase1', 'alllowercase1');

    expect(
      screen.getByText('新しいパスワードは大文字、小文字、数字を含む必要があります')
    ).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('確認パスワード不一致はサーバに送らず即時エラー', async () => {
    render(<ProfilePage onBack={() => {}} />);
    await fillAndSubmit('OldPass123', 'NewPass123', 'NewPass124');

    expect(screen.getByText('新しいパスワードが一致しません')).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('メールを変えるときは今のパスワードを一緒に送る', async () => {
    updateProfileMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ProfilePage onBack={() => {}} />);

    await user.click(screen.getByRole('button', { name: '編集' }));
    const email = screen.getByLabelText('メールアドレス');
    await user.clear(email);
    await user.type(email, 'new@example.com');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('メールアドレスを変えるには、今のパスワードを入力してください')).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('今のパスワード'), 'OldPass123');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: '更新する' }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        currentPassword: 'OldPass123',
      });
    });
  });

  it('成功時は入力フィールドがクリアされる', async () => {
    render(<ProfilePage onBack={() => {}} />);
    await fillAndSubmit('OldPass123', 'NewPass123', 'NewPass123');

    await waitFor(() => {
      expect(screen.getByLabelText('現在のパスワード')).toHaveValue('');
      expect(screen.getByLabelText('新しいパスワード')).toHaveValue('');
      expect(screen.getByLabelText('新しいパスワード（確認）')).toHaveValue('');
    });
  });
});
