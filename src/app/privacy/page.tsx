import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

/**
 * 隐私条款页面
 * 展示用户隐私政策和数据处理方式
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen gradient-bg">
      {/* 顶部导航 */}
      <header className="glass border-b border-white/40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">隐私条款</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="glass rounded-2xl p-8 space-y-8">
          {/* 引言 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">隐私政策</h2>
            <p className="text-slate-600 leading-relaxed">
              PixEase 非常重视用户的隐私保护。本隐私条款旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您仔细阅读并理解本条款的全部内容。
            </p>
          </section>

          {/* 核心原则 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">核心原则：本地处理</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-blue-800 leading-relaxed">
                <strong className="text-blue-900">所有图片处理均在您的本地浏览器中完成。</strong>
                我们不会将您的图片上传到任何服务器。这意味着：
              </p>
              <ul className="mt-4 space-y-2 text-blue-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  您的图片数据不会离开您的设备
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  我们无法访问、查看或保存您的图片
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  处理完成后，所有临时数据都会被清除
                </li>
              </ul>
            </div>
          </section>

          {/* 信息收集 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">信息收集</h3>
            <div className="space-y-4 text-slate-600">
              <p className="leading-relaxed">
                我们仅收集以下必要信息：
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">1</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">账户信息</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      当您注册账户时，我们会收集您的邮箱地址和用户名，用于身份验证和账户管理。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">使用数据</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      我们可能会收集匿名的使用统计数据，如功能使用频率、错误报告等，以改进产品体验。这些数据不包含任何个人身份信息。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">3</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">技术信息</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      我们可能会收集浏览器类型、操作系统、屏幕分辨率等技术信息，以优化产品性能和兼容性。
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* 信息使用 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">信息使用</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              我们使用收集的信息用于以下目的：
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                提供、维护和改进我们的服务
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                处理您的账户注册和登录
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                发送服务通知和更新信息
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                防止欺诈和滥用行为
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                遵守法律法规要求
              </li>
            </ul>
          </section>

          {/* 信息安全 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">信息安全</h3>
            <p className="text-slate-600 leading-relaxed">
              我们采取多种安全措施保护您的个人信息：
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-100/50 rounded-xl p-4">
                <h4 className="text-slate-800 font-medium mb-2">数据加密</h4>
                <p className="text-slate-500 text-sm">
                  所有数据传输均采用 SSL/TLS 加密，确保数据在传输过程中的安全。
                </p>
              </div>
              <div className="bg-slate-100/50 rounded-xl p-4">
                <h4 className="text-slate-800 font-medium mb-2">本地处理</h4>
                <p className="text-slate-500 text-sm">
                  图片处理完全在本地进行，不会上传到服务器，最大程度保护隐私。
                </p>
              </div>
              <div className="bg-slate-100/50 rounded-xl p-4">
                <h4 className="text-slate-800 font-medium mb-2">访问控制</h4>
                <p className="text-slate-500 text-sm">
                  严格的访问控制机制，确保只有授权人员才能访问必要的数据。
                </p>
              </div>
              <div className="bg-slate-100/50 rounded-xl p-4">
                <h4 className="text-slate-800 font-medium mb-2">定期审计</h4>
                <p className="text-slate-500 text-sm">
                  定期进行安全审计和漏洞扫描，及时发现和修复安全问题。
                </p>
              </div>
            </div>
          </section>

          {/* 用户权利 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">您的权利</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              根据相关法律法规，您享有以下权利：
            </p>
            <div className="space-y-3">
              {[
                { title: '访问权', desc: '您有权访问我们持有的关于您的个人信息' },
                { title: '更正权', desc: '您有权要求更正不准确的个人信息' },
                { title: '删除权', desc: '您有权要求删除您的个人信息' },
                { title: '限制处理权', desc: '在特定情况下，您有权限制我们对您个人信息的处理' },
                { title: '数据可携带权', desc: '您有权以结构化、通用的格式获取您的个人信息' },
              ].map((right, index) => (
                <div key={index} className="flex items-start gap-3 bg-slate-100/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-medium">{right.title}</h4>
                    <p className="text-slate-500 text-sm">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 条款更新 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">条款更新</h3>
            <p className="text-slate-600 leading-relaxed">
              我们可能会不时更新本隐私条款。更新后的条款将在本页面发布，并注明最后更新日期。建议您定期查看本条款以了解任何变更。如您继续使用我们的服务，即表示您同意更新后的条款。
            </p>
          </section>

          {/* 联系我们 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">联系我们</h3>
            <p className="text-slate-600 leading-relaxed">
              如果您对本隐私条款有任何疑问、意见或建议，或者您希望行使您的权利，请通过以下方式联系我们：
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="mailto:privacy@pixease.com"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                privacy@pixease.com
              </a>
            </div>
          </section>

          {/* 生效日期 */}
          <div className="border-t border-slate-200 pt-6">
            <p className="text-slate-500 text-sm text-center">
              最后更新日期：2024年1月1日
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
