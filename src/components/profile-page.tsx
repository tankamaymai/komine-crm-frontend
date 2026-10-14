'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import PageHeader from '@/components/page-header';
import ThemeSwitcher from '@/components/theme-switcher';

const ROLE_LABELS: Record<string, string> = {
  viewer: '閲覧者',
  operator: 'オペレーター',
  manager: 'マネージャー',
  admin: '管理者',
};

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, changePassword, updateProfile, isLoading } = useAuth();

  // プロフィール編集
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setProfileCurrentPassword('');
    setProfileError(null);
    setIsEditingProfile(true);
  };

  const cancelEditing = () => {
    setIsEditingProfile(false);
    setProfileCurrentPassword('');
    setProfileError(null);
  };

  const emailChanged =
    editEmail.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!editName.trim()) {
      setProfileError('名前を入力してください');
      return;
    }

    if (!editEmail.trim()) {
      setProfileError('メールアドレスを入力してください');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setProfileError('正しいメールアドレス形式で入力してください');
      return;
    }

    if (emailChanged && !profileCurrentPassword) {
      setProfileError('メールアドレスを変えるには、今のパスワードを入力してください');
      return;
    }

    // 変更がない場合は何もしない（大文字だけの差はメール変更にしない）
    if (editName.trim() === user?.name && !emailChanged) {
      setIsEditingProfile(false);
      return;
    }

    // バリデーション通過後、確認ダイアログを表示
    setShowProfileConfirm(true);
  };

  const executeProfileUpdate = async () => {
    const request: { name?: string; email?: string; currentPassword?: string } = {};
    if (editName.trim() !== user?.name) request.name = editName.trim();
    if (emailChanged) {
      request.email = editEmail.trim();
      request.currentPassword = profileCurrentPassword;
    }

    const result = await updateProfile(request);

    if (result.success) {
      setIsEditingProfile(false);
      setProfileCurrentPassword('');
    } else if (result.error) {
      setProfileError(result.error);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('現在のパスワードを入力してください');
      return;
    }

    if (!newPassword) {
      setPasswordError('新しいパスワードを入力してください');
      return;
    }

    // backend passwordSchema（authValidation.ts）と同条件で即時フィードバック
    if (newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (newPassword.length > 128) {
      setPasswordError('新しいパスワードは128文字以下で入力してください');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setPasswordError('新しいパスワードは大文字、小文字、数字を含む必要があります');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    const result = await changePassword({ currentPassword, newPassword, confirmPassword });

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="アカウント設定"
        subtitle="プロフィール情報・パスワード変更"
        theme="cha"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6 p-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </Button>
          </div>

          {/* プロフィール情報 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">プロフィール情報</CardTitle>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  className="cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  編集
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">名前</Label>
                    <Input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">メールアドレス</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1"
                      autoComplete="email"
                    />
                  </div>
                  {emailChanged && (
                    <div>
                      <Label htmlFor="profile-current-password">今のパスワード</Label>
                      <Input
                        id="profile-current-password"
                        type="password"
                        value={profileCurrentPassword}
                        onChange={(e) => setProfileCurrentPassword(e.target.value)}
                        className="mt-1"
                        autoComplete="current-password"
                      />
                      <p className="text-xs text-hai mt-1">
                        メールアドレスを変えるときだけ必要です。今のパスワードが合っているか確認します。
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-hai text-sm">権限</Label>
                      <p className="mt-1">
                        <span className="inline-block px-2 py-0.5 text-sm rounded bg-matsu-50 text-matsu-dark border border-matsu-100">
                          {user?.role ? ROLE_LABELS[user.role] || user.role : '-'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-hai text-sm">アカウント状態</Label>
                      <p className="mt-1">
                        {user?.isActive !== undefined ? (
                          <span
                            className={`inline-block px-2 py-0.5 text-sm rounded border ${user.isActive
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                          >
                            {user.isActive ? '有効' : '無効'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </p>
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? '更新中...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isLoading}
                      className="cursor-pointer"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-hai text-sm">名前</Label>
                    <p className="mt-1 text-sumi font-medium">{user?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-hai text-sm">メールアドレス</Label>
                    <p className="mt-1 text-sumi font-medium">{user?.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-hai text-sm">権限</Label>
                    <p className="mt-1">
                      <span className="inline-block px-2 py-0.5 text-sm rounded bg-matsu-50 text-matsu-dark border border-matsu-100">
                        {user?.role ? ROLE_LABELS[user.role] || user.role : '-'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-hai text-sm">アカウント状態</Label>
                    <p className="mt-1">
                      {user?.isActive !== undefined ? (
                        <span
                          className={`inline-block px-2 py-0.5 text-sm rounded border ${user.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                        >
                          {user.isActive ? '有効' : '無効'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* プロフィール更新確認ダイアログ */}
          <ConfirmDialog
            open={showProfileConfirm}
            onOpenChange={setShowProfileConfirm}
            title="プロフィールを更新しますか？"
            description={
              [
                editName.trim() !== user?.name && `名前: ${user?.name} → ${editName.trim()}`,
                emailChanged && `メールアドレス: ${user?.email} → ${editEmail.trim()}`,
              ]
                .filter(Boolean)
                .join('\n')
            }
            confirmLabel="更新する"
            onConfirm={executeProfileUpdate}
          />

          {/* パスワード変更 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">パスワード変更</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="current-password">現在のパスワード</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">新しいパスワード</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-hai mt-1">8文字以上で、大文字・小文字・数字を含めてください</p>
                </div>
                <div>
                  <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                    autoComplete="new-password"
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}

                <Button type="submit" disabled={isLoading} className="mt-2">
                  {isLoading ? 'パスワードを変更中...' : 'パスワードを変更'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 表示テーマ */}
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
