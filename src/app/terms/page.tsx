import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

/**
 * 服务协议页面
 * 展示用户使用服务的条款和条件
 */
export default function TermsPage() {
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
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">服务协议</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="glass rounded-2xl p-8 space-y-8">
          {/* 引言 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">服务协议</h2>
            <p className="text-slate-600 leading-relaxed">
              欢迎使用 PixEase！本服务协议（以下简称"协议"）是您与 PixEase 之间关于使用我们提供的图片处理服务的法律协议。请您仔细阅读并理解本协议的全部内容。
            </p>
          </section>

          {/* 服务说明 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">服务说明</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              PixEase 是一款专业的图片处理工具，提供以下核心功能：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'GIF 编辑', desc: '支持 GIF 文件的拆帧、编辑、合成、压缩、倒放等功能' },
                { title: '格式转换', desc: '支持 JPG、PNG、WEBP、AVIF 等格式之间的相互转换' },
                { title: '图片压缩', desc: '提供无损、高清、极限等多种压缩模式' },
                { title: '像素风格', desc: '支持像素风、GameBoy 风格、ASCII 艺术等效果' },
              ].map((feature, index) => (
                <div key={index} className="bg-slate-100/50 rounded-xl p-4">
                  <h4 className="text-slate-800 font-medium mb-2">{feature.title}</h4>
                  <p className="text-slate-500 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 使用规则 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">使用规则</h3>
            <div className="space-y-4 text-slate-600">
              <p className="leading-relaxed">
                使用我们的服务时，您同意遵守以下规则：
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">1</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">合法使用</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      您承诺不使用本服务进行任何违法、侵权或不当行为，包括但不限于处理涉及色情、暴力、恐怖主义等内容的图片。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">知识产权</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      您应确保您拥有处理图片的合法权利。我们尊重知识产权，不保留任何用户上传图片的副本。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">3</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">账户安全</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      您有责任保护您的账户信息安全，不得将账户转让、出借或共享给他人使用。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">4</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">禁止滥用</strong>
                    <p className="text-slate-500 text-sm mt-1">
                      不得使用自动化工具、脚本或爬虫等方式滥用我们的服务，不得干扰服务的正常运行。
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* 免责声明 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">免责声明</h3>
            <div className="space-y-4 text-slate-600">
              <p className="leading-relaxed">
                在法律允许的最大范围内，我们对以下情况不承担责任：
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>因网络故障、系统维护、设备故障等技术原因导致的服务中断或数据丢失</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>因用户操作不当或违反本协议导致的任何损失</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>因不可抗力因素（如自然灾害、战争、政府行为等）导致的服务中断</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>用户上传或处理的图片内容引发的任何法律纠纷</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 服务变更 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">服务变更与终止</h3>
            <p className="text-slate-600 leading-relaxed">
              我们保留随时修改、暂停或终止服务的权利，恕不另行通知。我们可能因系统维护、升级或其他原因暂时中断服务。如您违反本协议，我们有权终止您的账户并拒绝您继续使用服务。
            </p>
          </section>

          {/* 知识产权 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">知识产权</h3>
            <p className="text-slate-600 leading-relaxed">
              PixEase 的所有内容，包括但不限于文字、图片、图标、界面设计、代码等，均受版权法和其他知识产权法律保护。未经我们书面许可，您不得复制、修改、传播、展示或用于商业目的。
            </p>
          </section>

          {/* 争议解决 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">争议解决</h3>
            <p className="text-slate-600 leading-relaxed">
              本协议的订立、执行和解释均适用中华人民共和国法律。如双方就本协议内容或其执行发生争议，应首先通过友好协商解决；协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。
            </p>
          </section>

          {/* 协议更新 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">协议更新</h3>
            <p className="text-slate-600 leading-relaxed">
              我们可能会不时更新本服务协议。更新后的协议将在本页面发布，并注明最后更新日期。建议您定期查看本协议以了解任何变更。如您继续使用我们的服务，即表示您同意更新后的协议。
            </p>
          </section>

          {/* 联系我们 */}
          <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">联系我们</h3>
            <p className="text-slate-600 leading-relaxed">
              如果您对本服务协议有任何疑问或建议，请通过以下方式联系我们：
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="mailto:support@pixease.com"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                support@pixease.com
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
