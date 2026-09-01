(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(fn, 0); });
    else setTimeout(fn, 0);
  }

  ready(function () {
    var habitsBtn = document.getElementById('navHabitos');
    var settingsBtn = document.getElementById('navAjustes');
    var normalNav = ['navHoy','navCalendario','navBitacora','navObjetivos'];

    function clearHabitsFocus() {
      document.body.classList.remove('habits-focus');
      // setViewMode() only manages is-active for its own 4 nav items, so the
      // Hábitos button (which bypasses setViewMode) has to be cleared here or
      // it stays highlighted after navigating elsewhere.
      if (habitsBtn) habitsBtn.classList.remove('is-active');
    }
    normalNav.forEach(function(id){ var el=document.getElementById(id); if(el) el.addEventListener('click', clearHabitsFocus); });
    var toggles = document.getElementById('viewToggle');
    if (toggles) toggles.addEventListener('click', clearHabitsFocus);

    if (habitsBtn) {
      habitsBtn.addEventListener('click', function () {
        document.body.classList.add('habits-focus');
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(b){ b.classList.remove('is-active'); });
        habitsBtn.classList.add('is-active');
        // El botón de Hábitos no pasa por setViewMode(), así que debe ocultar a mano
        // las demás secciones (si no, se quedan visibles debajo del panel de hábitos).
        var board = document.getElementById('board');
        if (board) { board.classList.remove('view-day', 'view-week'); board.hidden = true; }
        var habitsSection = document.getElementById('habitsSection');
        if (habitsSection) habitsSection.hidden = false;
        ['weekQuickView', 'bitacoraSection', 'objetivosSection', 'monthSummarySection', 'futureLogSection'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.hidden = true;
        });
        requestAnimationFrame(function(){
          var section=document.getElementById('habitsSection');
          if(section) section.scrollIntoView({behavior:'smooth',block:'start'});
        });
      });
    }

    function closeSettings() {
      var p=document.getElementById('bitacoraSettingsPanel');
      var b=document.getElementById('bitacoraSettingsBackdrop');
      if(p) p.remove(); if(b) b.remove();
    }

    function applyPrefs() {
      var density=localStorage.getItem('bitacora-density') || 'comfortable';
      var font=localStorage.getItem('bitacora-font') || 'normal';
      document.body.classList.toggle('ui-compact', density==='compact');
      document.documentElement.classList.toggle('ui-font-large', font==='large');
    }
    applyPrefs();

    function openSettings() {
      closeSettings();
      var backdrop=document.createElement('div');
      backdrop.id='bitacoraSettingsBackdrop'; backdrop.className='bitacora-settings-backdrop';
      var panel=document.createElement('aside');
      panel.id='bitacoraSettingsPanel'; panel.className='bitacora-settings-panel';
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label','Ajustes');
      panel.innerHTML =
        '<div class="bitacora-settings-head"><h2>Ajustes</h2><button class="bitacora-settings-close" type="button" aria-label="Cerrar">✕</button></div>'+
        '<div class="bitacora-setting-group"><h3>Vista</h3><p>Elige cuánto espacio quieres entre los elementos.</p><div class="bitacora-setting-row"><button type="button" class="bitacora-setting-btn" data-density="comfortable">Cómoda</button><button type="button" class="bitacora-setting-btn" data-density="compact">Compacta</button></div></div>'+
        '<div class="bitacora-setting-group"><h3>Tamaño de texto</h3><p>Puedes aumentar la lectura sin perder la adaptación a tablet o celular.</p><div class="bitacora-setting-row"><button type="button" class="bitacora-setting-btn" data-font="normal">Normal</button><button type="button" class="bitacora-setting-btn" data-font="large">Grande</button></div></div>'+
        '<div class="bitacora-setting-group"><h3>Datos</h3><p>Tu agenda, tareas, hábitos y notas se sincronizan con la base de datos de la Bitácora.</p></div>'+
        '<button type="button" class="bitacora-setting-btn danger" id="settingsLogout">Cerrar sesión</button>';
      document.body.appendChild(backdrop); document.body.appendChild(panel);
      function refreshActive(){
        var d=localStorage.getItem('bitacora-density')||'comfortable', f=localStorage.getItem('bitacora-font')||'normal';
        panel.querySelectorAll('[data-density]').forEach(function(x){x.classList.toggle('is-active',x.dataset.density===d);});
        panel.querySelectorAll('[data-font]').forEach(function(x){x.classList.toggle('is-active',x.dataset.font===f);});
      }
      refreshActive();
      panel.querySelector('.bitacora-settings-close').addEventListener('click',closeSettings);
      backdrop.addEventListener('click',closeSettings);
      panel.querySelectorAll('[data-density]').forEach(function(x){x.addEventListener('click',function(){localStorage.setItem('bitacora-density',x.dataset.density);applyPrefs();refreshActive();});});
      panel.querySelectorAll('[data-font]').forEach(function(x){x.addEventListener('click',function(){localStorage.setItem('bitacora-font',x.dataset.font);applyPrefs();refreshActive();});});
      panel.querySelector('#settingsLogout').addEventListener('click',function(){ var logout=document.getElementById('logoutBtn'); if(logout) logout.click(); });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openSettings(); });
    }
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeSettings(); });
  });
})();
