'use client'

import { Suspense } from 'react'
import { PasswordSetForm } from '@/components/password-set-form'

export default function SetPasswordPage() {
  // 招待メールのリンクは、すでに別の人でログインしていても開く。
  // ログイン中だとホームへ飛ばすと、パスワードを決める画面が出ない。
  return (
    <Suspense>
      <PasswordSetForm mode="set" />
    </Suspense>
  )
}
