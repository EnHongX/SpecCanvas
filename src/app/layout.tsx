import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecCanvas - 文档管理",
  description: "一个简单的 Markdown 文档管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <header className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  SpecCanvas
                </h1>
                <nav className="flex space-x-4">
                  <a
                    href="/"
                    className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    首页
                  </a>
                  <a
                    href="/documents"
                    className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    文档列表
                  </a>
                  <a
                    href="/types"
                    className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    类型管理
                  </a>
                  <a
                    href="/documents/new"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    新建文档
                  </a>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="bg-white dark:bg-gray-800 shadow-inner mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} SpecCanvas. All rights reserved.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
