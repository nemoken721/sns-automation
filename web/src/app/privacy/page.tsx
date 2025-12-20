import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | SNS Automation',
  description: 'SNS Automationサービスのプライバシーポリシー',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            SNS Automation
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            ログイン
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">プライバシーポリシー</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
          <p className="text-sm text-gray-400">最終更新日: 2024年12月20日</p>

          <p>
            SNS Automation（以下「当サービス」といいます）は、ユーザーの個人情報の保護を重要と考え、
            以下のプライバシーポリシーに従って個人情報を取り扱います。
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 収集する情報</h2>
            <p>当サービスでは、以下の情報を収集します：</p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">1.1 ユーザーが提供する情報</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>メールアドレス</li>
              <li>氏名（任意）</li>
              <li>プロフィール画像（任意）</li>
              <li>お支払い情報（クレジットカード情報はStripeが管理し、当サービスは保持しません）</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">1.2 SNS連携により取得する情報</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Instagramアカウント情報（ユーザーID、ユーザー名、アクセストークン）</li>
              <li>X（Twitter）アカウント情報（ユーザーID、ユーザー名、アクセストークン）</li>
              <li>投稿のインサイト・アナリティクスデータ</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">1.3 自動的に収集する情報</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）</li>
              <li>利用状況（機能の使用頻度、エラー情報）</li>
              <li>Cookie情報</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 情報の利用目的</h2>
            <p>収集した情報は、以下の目的で利用します：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>サービスの提供・運営</li>
              <li>ユーザー認証・アカウント管理</li>
              <li>SNSへのコンテンツ投稿機能の提供</li>
              <li>課金処理・請求</li>
              <li>カスタマーサポートの提供</li>
              <li>サービスの改善・新機能の開発</li>
              <li>利用規約違反の調査・対応</li>
              <li>重要なお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 情報の共有</h2>
            <p>当サービスは、以下の場合を除き、ユーザーの個人情報を第三者と共有しません：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく開示要求がある場合</li>
              <li>サービス提供に必要な業務委託先（以下参照）</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">利用する外部サービス</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Supabase</strong> - データベース・認証基盤</li>
              <li><strong>Stripe</strong> - 決済処理</li>
              <li><strong>Vercel</strong> - ホスティング</li>
              <li><strong>Google Cloud</strong> - 動画生成処理</li>
              <li><strong>Meta（Instagram API）</strong> - Instagram連携</li>
              <li><strong>X（Twitter API）</strong> - X連携</li>
              <li><strong>OpenAI</strong> - AI画像生成</li>
              <li><strong>Google AI</strong> - AI台本生成</li>
              <li><strong>ElevenLabs</strong> - AI音声生成</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. データの保管</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>ユーザーデータは、サービス利用中およびアカウント削除後30日間保管されます。</li>
              <li>生成された動画・画像は、Supabase Storageに保管されます。</li>
              <li>SNSアクセストークンは暗号化して保管されます。</li>
              <li>データは主に日本国内のサーバーに保管されますが、一部の処理において海外サーバーを利用する場合があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. セキュリティ</h2>
            <p>当サービスは、以下のセキュリティ対策を実施しています：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>SSL/TLSによる通信の暗号化</li>
              <li>パスワードのハッシュ化</li>
              <li>アクセストークンの暗号化保管</li>
              <li>行レベルセキュリティ（RLS）によるデータアクセス制御</li>
              <li>定期的なセキュリティ監査</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Cookieの使用</h2>
            <p>当サービスでは、以下の目的でCookieを使用します：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>ログイン状態の維持</li>
              <li>ユーザー設定の保存</li>
              <li>サービス利用状況の分析</li>
            </ul>
            <p className="mt-2">
              ブラウザの設定でCookieを無効にすることができますが、一部の機能が正常に動作しなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. ユーザーの権利</h2>
            <p>ユーザーは、以下の権利を有します：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong>アクセス権</strong> - 保有する個人情報の開示を請求できます</li>
              <li><strong>訂正権</strong> - 不正確な個人情報の訂正を請求できます</li>
              <li><strong>削除権</strong> - 個人情報の削除を請求できます</li>
              <li><strong>データポータビリティ</strong> - 個人情報のエクスポートを請求できます</li>
              <li><strong>SNS連携の解除</strong> - いつでもSNSアカウントの連携を解除できます</li>
            </ul>
            <p className="mt-2">
              これらの権利を行使する場合は、設定ページから操作するか、下記お問い合わせ先までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 子どものプライバシー</h2>
            <p>
              当サービスは、13歳未満の子どもを対象としていません。
              13歳未満の方が個人情報を提供したことが判明した場合、当該情報は速やかに削除されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. プライバシーポリシーの変更</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>当サービスは、必要に応じて本ポリシーを変更することがあります。</li>
              <li>重要な変更がある場合は、メールまたはサービス上で通知します。</li>
              <li>変更後も当サービスを利用し続けることで、変更に同意したものとみなされます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. お問い合わせ</h2>
            <p>
              プライバシーに関するお問い合わせは、以下までご連絡ください。
            </p>
            <p className="mt-2">
              メール: privacy@example.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/terms" className="hover:text-white transition-colors">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              プライバシーポリシー
            </Link>
          </div>
          <p>&copy; 2024 SNS Automation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
