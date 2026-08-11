// i18n 语言切换热补丁
// 用途：修复生产环境 Next.js Link prefetch 导致的语言切换失效问题
// 原理：劫持语言切换按钮点击，强制用 location.href 硬跳转绕过客户端缓存
(function() {
  'use strict';

  function patchLocaleSwitcher() {
    const switcher = document.querySelector('.vp-locale-switch');
    if (!switcher) return;

    const links = switcher.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const href = this.getAttribute('href');
        if (href) {
          window.location.href = href;
        }
      }, true); // 使用捕获阶段，优先级高于 Next.js
    });

    console.log('[i18n-fix] 语言切换补丁已生效');
  }

  // DOM 加载完后立即执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchLocaleSwitcher);
  } else {
    patchLocaleSwitcher();
  }
})();
