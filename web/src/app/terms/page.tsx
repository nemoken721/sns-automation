import Link from 'next/link'

export const metadata = {
  title: '利用規約 | SNS Automation',
  description: 'SNS Automationサービスの利用規約',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-8">利用規約</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
          <p className="text-sm text-gray-400">最終更新日: 2024年12月20日</p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第1条（適用）</h2>
            <p>
              本利用規約（以下「本規約」といいます）は、SNS Automation（以下「当サービス」といいます）の利用条件を定めるものです。
              ユーザーの皆様には、本規約に同意いただいた上で、当サービスをご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第2条（定義）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>「ユーザー」とは、当サービスを利用する個人または法人を指します。</li>
              <li>「コンテンツ」とは、当サービスを通じて生成された動画、画像、テキスト等を指します。</li>
              <li>「サブスクリプション」とは、当サービスの有料プランを指します。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第3条（アカウント登録）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>ユーザーは、正確かつ最新の情報を提供してアカウントを登録するものとします。</li>
              <li>ユーザーは、自己のアカウント情報を適切に管理する責任を負います。</li>
              <li>アカウントの不正使用により生じた損害について、当サービスは責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第4条（サービス内容）</h2>
            <p>当サービスは以下の機能を提供します：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>AIを活用した動画コンテンツの自動生成</li>
              <li>SNSプラットフォームへの投稿管理・スケジューリング</li>
              <li>投稿パフォーマンスの分析・レポート</li>
              <li>その他、当サービスが提供する機能</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第5条（料金・支払い）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>有料プランの料金は、当サービスの料金ページに記載のとおりとします。</li>
              <li>サブスクリプション料金は、毎月自動的に請求されます。</li>
              <li>プランの変更・解約は、いつでも可能です。解約後も請求期間の終了までサービスをご利用いただけます。</li>
              <li>一度支払われた料金の返金は、原則として行いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第6条（禁止事項）</h2>
            <p>ユーザーは、以下の行為を行ってはなりません：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスのサーバーまたはネットワークに過度な負荷をかける行為</li>
              <li>当サービスの運営を妨害する行為</li>
              <li>他のユーザーに関する個人情報を収集・蓄積する行為</li>
              <li>他のユーザーになりすます行為</li>
              <li>当サービスに関連して反社会的勢力に利益を供与する行為</li>
              <li>著作権、商標権等の知的財産権を侵害するコンテンツの生成</li>
              <li>虚偽の情報を含むコンテンツの生成・拡散</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第7条（知的財産権）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>当サービスを通じてユーザーが生成したコンテンツの著作権は、ユーザーに帰属します。</li>
              <li>当サービス自体の著作権、商標権等の知的財産権は、当サービス運営者に帰属します。</li>
              <li>ユーザーは、生成したコンテンツを商用利用することができます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第8条（サービスの中断・停止）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>当サービスは、以下の場合にサービスの全部または一部を中断・停止することがあります：
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>システムの保守・点検を行う場合</li>
                  <li>地震、火災、停電等の不可抗力が発生した場合</li>
                  <li>その他、運営上必要と判断した場合</li>
                </ul>
              </li>
              <li>サービスの中断・停止により生じた損害について、当サービスは責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第9条（免責事項）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>当サービスは、生成されるコンテンツの品質、正確性、適法性を保証しません。</li>
              <li>当サービスの利用により生じたSNSアカウントの凍結等の損害について、当サービスは責任を負いません。</li>
              <li>ユーザー間または第三者との間で生じたトラブルについて、当サービスは一切関与しません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第10条（利用規約の変更）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>当サービスは、必要に応じて本規約を変更することができます。</li>
              <li>変更後の規約は、当サービス上に掲載した時点で効力を生じます。</li>
              <li>重要な変更については、メール等で事前にお知らせします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">第11条（準拠法・管轄裁判所）</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>本規約の解釈は、日本法に準拠します。</li>
              <li>当サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">お問い合わせ</h2>
            <p>
              本規約に関するお問い合わせは、以下までご連絡ください。
            </p>
            <p className="mt-2">
              メール: support@example.com
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
