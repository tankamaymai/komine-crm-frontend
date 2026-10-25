'use client'

import { Suspense } from 'react'
import { PasswordSetForm } from '@/components/password-set-form'

export default function ResetPasswordPage() {
  // 再設定メールのリンクは、すでにログインしていても開く。
  // ログイン中だとホームへ飛ばすと、新しいパスワードを決める画面が出ない。
  return (
    <Suspense>
      <PasswordSetForm mode="reset" />
    </Suspense>
  )
}
