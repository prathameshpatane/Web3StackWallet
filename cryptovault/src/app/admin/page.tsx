import { redirect } from 'next/navigation'

export default function AdminPage() {
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '/admin/')
      : process.env.NODE_ENV === 'production'
      ? 'https://web3-stack-wallet-4ug3.vercel.app/admin/'
      : 'http://localhost:8000/admin/')

  redirect(adminUrl)
}
