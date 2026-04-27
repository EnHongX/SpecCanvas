'use client';

import { useState, useEffect } from 'react';
import type { DesignPreviewData, ParseResult } from '@/lib/design-preview';

interface DesignPreviewProps {
  parseResult: ParseResult;
}

const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getContrastColor = (hexColor: string): string => {
  if (!isValidHexColor(hexColor)) {
    return '#000000';
  }
  
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const ThemeToggle = ({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) => {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

const ErrorDisplay = ({ errors }: { errors: string[] }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-red-800 dark:text-red-200">
              文档格式错误
            </h1>
          </div>
          <p className="text-red-700 dark:text-red-300 mb-4">
            您的 DESIGN.md 不符合约定格式。请检查以下问题并修正：
          </p>
          <ul className="space-y-2">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              正确格式示例：
            </h2>
            <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`# My Design System

这是一个现代化的设计系统，用于构建一致的用户界面。

## Colors

primary: #2563eb
secondary: #64748b
accent: #f59e0b
success: #10b981
error: #ef4444

## Typography

heading: 'Inter', 32px/1.2, bold
body: 'Inter', 16px/1.5, regular
caption: 'Inter', 12px/1.4, light

## Components

button.primary: 主要按钮，使用 primary 颜色，圆角 8px
card: 卡片组件，带阴影和圆角
input: 输入框，边框 1px，聚焦时显示 primary 颜色

## Responsive

desktop: 1200px, 4 列网格
tablet: 768px, 2 列网格
mobile: 360px, 1 列网格`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const DesignPreviewContent = ({ data }: { data: DesignPreviewData }) => {
  const primaryColor = data.colors[0]?.value || '#2563eb';
  const secondaryColor = data.colors[1]?.value || '#64748b';
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Hero Section */}
      <section 
        className="relative py-20 px-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)` 
        }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {data.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            {data.description}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              开始使用
            </button>
            <button className="px-8 py-3 rounded-lg font-semibold border-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
              查看文档
            </button>
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            颜色系统
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-10">
            精心设计的颜色调色板，确保视觉一致性和可访问性
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {data.colors.map((color, index) => {
              const isValid = isValidHexColor(color.value);
              const bgColor = isValid ? color.value : '#e5e7eb';
              const textColor = isValid ? getContrastColor(color.value) : '#6b7280';
              
              return (
                <div key={index} className="group">
                  <div 
                    className="h-24 rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105 flex items-center justify-center"
                    style={{ backgroundColor: bgColor }}
                  >
                    <span 
                      className="text-sm font-mono font-medium"
                      style={{ color: textColor }}
                    >
                      {color.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {color.name}
                    </p>
                    {!isValid && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        无效的颜色值
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section className="py-16 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            字体系统
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-10">
            层级分明的字体结构，确保内容的可读性和视觉层次
          </p>
          <div className="space-y-8">
            {data.typography.map((type, index) => (
              <div 
                key={index} 
                className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {type.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                      {type.value}
                    </p>
                  </div>
                </div>
                <div 
                  className="text-gray-900 dark:text-white leading-relaxed"
                  style={{
                    fontFamily: type.value.includes("'") ? type.value.match(/'([^']+)'/)?.[1] || 'sans-serif' : 'sans-serif',
                    fontSize: type.value.match(/(\d+)px/) ? `${parseInt(type.value.match(/(\d+)px/)![1]) * 1.5}px` : '24px',
                    lineHeight: type.value.match(/(\d+\.?\d*),\s*(\d+\.?\d*)/) ? parseFloat(type.value.match(/(\d+\.?\d*),\s*(\d+\.?\d*)/)![2]) : 1.5,
                    fontWeight: type.value.toLowerCase().includes('bold') ? 'bold' : type.value.toLowerCase().includes('light') ? '300' : 'normal',
                  }}
                >
                  快速的棕色狐狸跳过了懒惰的狗。The quick brown fox jumps over the lazy dog.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Components Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            组件库
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-10">
            可复用的 UI 组件，加速开发流程
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.components.map((component, index) => (
              <div 
                key={index}
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <svg 
                      className="w-5 h-5"
                      style={{ color: primaryColor }}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {component.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {component.description || '暂无描述'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsive Section (if available) */}
      {data.responsive.length > 0 && (
        <section className="py-16 px-4 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              响应式设计
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-10">
              适配多种设备尺寸，提供一致的用户体验
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.responsive.map((item, index) => (
                <div 
                  key={index}
                  className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center"
                >
                  <div 
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <svg 
                      className="w-8 h-8"
                      style={{ color: primaryColor }}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.breakpoint}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {item.description || '暂无描述'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section 
        className="py-20 px-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${secondaryColor}ee 100%)` 
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            准备好开始了吗？
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            使用这个设计系统构建出色的用户界面，确保品牌一致性和开发效率。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-100 hover:scale-105">
              查看完整文档
            </button>
            <button className="px-8 py-3 bg-white/20 text-white border border-white/30 rounded-lg font-semibold transition-all duration-200 hover:bg-white/30 hover:scale-105">
              下载资源
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            由 SpecCanvas 生成 · {data.title} · {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export const DesignPreview = ({ parseResult }: DesignPreviewProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggle = () => {
    setIsDark(!isDark);
  };

  if (!parseResult.ok || !parseResult.data) {
    return (
      <div className="relative">
        <ThemeToggle isDark={isDark} onToggle={handleToggle} />
        <ErrorDisplay errors={parseResult.errors} />
      </div>
    );
  }

  return (
    <div className="relative">
      <ThemeToggle isDark={isDark} onToggle={handleToggle} />
      <DesignPreviewContent data={parseResult.data} />
    </div>
  );
};
