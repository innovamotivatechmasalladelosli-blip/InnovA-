(function () {
  function updateShell() {
    const user = window.authManager?.getCurrentUser?.();
    const header = document.getElementById('app-header');
    const userName = document.getElementById('user-name');
    if (user && header) {
      header.classList.remove('hidden');
      if (userName) userName.textContent = user.username || 'Usuario';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      window.authManager?.logout();
      window.location.reload();
    });
    updateShell();
  });

  window.updateInnovAShell = updateShell;
})();
