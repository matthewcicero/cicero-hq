function initDashboard() {

    (function () {
      var navButtons = document.querySelectorAll('.nav button');
      var manualAssets = [];
      function activate(target) {
        document.querySelectorAll('.view').forEach(function (view) { view.classList.toggle('active', view.id === target); });
        navButtons.forEach(function (item) {
          var selected = item.getAttribute('data-view') === target;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        if (target === 'career') window.setTimeout(initOfficeMap, 0);
      }
      navButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          activate(button.getAttribute('data-view'));
          window.scrollTo({ top: document.querySelector('.nav-wrap').offsetTop, behavior: 'auto' });
        });
      });
      document.querySelectorAll('[data-jump]').forEach(function (button) {
        button.addEventListener('click', function () {
          activate(button.getAttribute('data-jump'));
          var focus = document.getElementById(button.getAttribute('data-focus'));
          if (focus) focus.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      var filterButtons = document.querySelectorAll('.filter button');
      var rows = document.querySelectorAll('.holdings-panel tbody tr');
      var cryptoSymbols = ['IBIT', 'ETHA', 'BSOL', 'ETH', 'LINK'];
      filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          var filter = button.getAttribute('data-filter');
          filterButtons.forEach(function (item) { item.classList.toggle('active', item === button); });
          rows.forEach(function (row) {
            var ticker = row.querySelector('.ticker');
            var symbol = ticker ? ticker.textContent.trim() : '';
            var isCrypto = cryptoSymbols.indexOf(symbol) !== -1;
            var visible = filter === 'all' || (filter === 'crypto' && isCrypto) || (filter === 'stocks' && !isCrypto && symbol !== 'Cash') || row.getAttribute('data-result') === filter;
            row.style.display = visible ? '' : 'none';
          });
        });
      });
      function parseMoney(text) { return Number(String(text).replace(/[^0-9.]/g, '')) || 0; }
      function formatMoney(value) { var sign = value < 0 ? '−' : ''; return sign + '$' + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      var hqData = JSON.parse(document.getElementById('hq-data').textContent || '{}');
      var inventoryAccounts = Array.isArray(hqData.accounts) ? hqData.accounts.slice() : [];
      function renderConnectedAccounts(accounts) {
        var list = document.getElementById('connected-account-list');
        if (!list) return;
        list.replaceChildren();
        (Array.isArray(accounts) ? accounts : []).forEach(function (account) {
          var record = document.createElement('article');
          record.className = 'connected-account' + (account.personalNetWorth === false ? ' company-money' : '');
          record.setAttribute('role', 'listitem');
          var head = document.createElement('div'); head.className = 'connected-account-head';
          var institution = document.createElement('span'); institution.className = 'account-institution'; institution.textContent = account.institution || 'Institution';
          var name = document.createElement('h3'); name.textContent = account.name || 'Account';
          var meta = document.createElement('div'); meta.className = 'connected-account-meta';
          var type = document.createElement('span'); type.className = 'connected-account-type'; type.textContent = (account.type || 'account') + ' · ' + (account.source || 'connected');
          meta.appendChild(type);
          if (account.personalNetWorth === false) {
            var company = document.createElement('span'); company.className = 'company-money-badge'; company.textContent = 'Company money'; meta.appendChild(company);
          }
          head.append(institution, name, meta);
          var balance = document.createElement('strong'); balance.className = 'connected-account-balance';
          var hasBalance = typeof account.balance === 'number' && Number.isFinite(account.balance);
          balance.textContent = hasBalance ? formatMoney(account.balance) : 'Manual / unknown';
          if (hasBalance && account.balance > 0) balance.classList.add('positive');
          if (hasBalance && account.balance < 0) balance.classList.add('negative');
          if (!hasBalance) balance.classList.add('unknown');
          record.append(head, balance);
          if (account.note) { var note = document.createElement('p'); note.className = 'connected-account-note'; note.textContent = account.note; record.appendChild(note); }
          list.appendChild(record);
        });
      }
      renderConnectedAccounts(inventoryAccounts);
      // 401(k) balance flows into net worth: recalc when retirement inputs change
      ['retirement-plan','retirement-balance','retirement-pretax','retirement-roth','retirement-allocation'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', function(){ try { updateBalanceSheet(); } catch(e){} });
          el.addEventListener('change', function(){ try { updateBalanceSheet(); } catch(e){} });
        }
      });
      var retirementInputs = {
        plan: document.getElementById('retirement-plan'),
        balance: document.getElementById('retirement-balance'),
        pretax: document.getElementById('retirement-pretax'),
        roth: document.getElementById('retirement-roth'),
        allocation: document.getElementById('retirement-allocation')
      };
      function retirementPercent(value) {
        var number = Math.max(0, Number(value) || 0);
        return number.toFixed(1).replace('.0', '') + '%';
      }
      function renderRetirementCapital() {
        if (!retirementInputs.plan) return;
        var plaidRetirement = inventoryAccounts.find(function (account) {
          var descriptor = [account.institution, account.name, account.type].join(' ').toLowerCase();
          return String(account.source || '').toLowerCase() === 'plaid' && /(401\s*\(?k\)?|retire|pension|\bira\b)/.test(descriptor);
        });
        var fields = [retirementInputs.plan, retirementInputs.balance, retirementInputs.pretax, retirementInputs.roth, retirementInputs.allocation];
        if (plaidRetirement) {
          retirementInputs.plan.value = plaidRetirement.name || plaidRetirement.institution || 'Retirement account';
          retirementInputs.balance.value = typeof plaidRetirement.balance === 'number' ? plaidRetirement.balance.toFixed(2) : '';
          retirementInputs.pretax.value = typeof plaidRetirement.preTaxPercent === 'number' ? plaidRetirement.preTaxPercent : '';
          retirementInputs.roth.value = typeof plaidRetirement.rothPercent === 'number' ? plaidRetirement.rothPercent : '';
          retirementInputs.allocation.value = plaidRetirement.allocation || 'Allocation not reported by Plaid';
          fields.forEach(function (field) { field.disabled = true; });
          document.getElementById('retirement-source').textContent = 'Plaid';
          document.getElementById('retirement-meta').textContent = (plaidRetirement.institution || 'Connected institution') + (plaidRetirement.asOf ? ' · as of ' + plaidRetirement.asOf : ' · linked retirement account');
          document.getElementById('retirement-mode-note').textContent = 'Plaid retirement data is active and takes precedence over the manual fallback values.';
        }
        var balance = Math.max(0, Number(retirementInputs.balance.value) || 0);
        var totalRate = Math.max(0, Number(retirementInputs.pretax.value) || 0) + Math.max(0, Number(retirementInputs.roth.value) || 0);
        document.getElementById('retirement-plan-display').textContent = retirementInputs.plan.value.trim() || 'Retirement plan';
        document.getElementById('retirement-balance-display').textContent = formatMoney(balance);
        document.getElementById('retirement-total-rate').textContent = retirementPercent(totalRate) + ' per paycheck';
      }
      Object.keys(retirementInputs).forEach(function (key) {
        if (retirementInputs[key]) retirementInputs[key].addEventListener('input', renderRetirementCapital);
      });
      renderRetirementCapital();
      function updateBalanceSheet() {
        var panel = document.getElementById('manual-assets-panel');
        var baseAssets = Number(panel.dataset.baseAssets);
        var baseLiabilities = Number(panel.dataset.baseLiabilities);
        var manualAssetValue = manualAssets.reduce(function (sum, asset) { return sum + (asset.value > 0 ? asset.value : 0); }, 0);
        var manualDebtValue = manualAssets.reduce(function (sum, asset) { return sum + (asset.value < 0 ? Math.abs(asset.value) : 0); }, 0);
        var apple = document.getElementById('apple-balance');
        var appleValue = Math.max(Number(apple.value) || Number(apple.min), Number(apple.min));
        var retirementBalanceEl = document.getElementById('retirement-balance');
        var retirementValue = retirementBalanceEl ? (Number(retirementBalanceEl.value) || 0) : 0;
        var assets = baseAssets + manualAssetValue + retirementValue;
        var liabilities = baseLiabilities + appleValue + manualDebtValue;
        var net = assets - liabilities;
        var netLabel = (net < 0 ? '−' : '+') + formatMoney(Math.abs(net));
        var manualDebtNames = manualAssets.filter(function (asset) { return asset.value < 0; }).map(function (asset) { return asset.name; });
        var manualAssetNames = manualAssets.filter(function (asset) { return asset.value > 0; }).map(function (asset) { return asset.name; });
        document.getElementById('aum-total').textContent = formatMoney(assets);
        document.getElementById('command-assets').textContent = formatMoney(assets);
        document.getElementById('command-liabilities').textContent = formatMoney(liabilities);
        document.getElementById('posture-assets').textContent = formatMoney(assets);
        document.getElementById('posture-liabilities').textContent = formatMoney(liabilities);
        document.getElementById('command-net-worth').textContent = netLabel;
        document.getElementById('command-net-worth').classList.toggle('negative', net < 0);
        document.getElementById('command-net-worth').classList.toggle('positive', net >= 0);
        document.getElementById('apple-balance-display').textContent = appleValue ? formatMoney(appleValue) + ' owed' : 'Not entered';
        document.getElementById('flow-total-debt').textContent = formatMoney(liabilities);
        document.getElementById('flow-linked-assets-label').textContent = formatMoney(baseAssets);
        document.getElementById('flow-manual-assets-label').textContent = formatMoney(manualAssetValue);
        document.getElementById('flow-assets-label').textContent = formatMoney(assets);
        document.getElementById('flow-apple-label').textContent = formatMoney(appleValue);
        document.getElementById('flow-manual-debt-label').textContent = formatMoney(manualDebtValue);
        document.getElementById('flow-debt-label').textContent = formatMoney(liabilities);
        document.getElementById('flow-networth-label').textContent = netLabel;
        document.getElementById('flow-apple-summary').textContent = formatMoney(appleValue);
        document.getElementById('flow-manual-debt-summary').textContent = formatMoney(manualDebtValue);
        document.getElementById('flow-manual-assets-summary').textContent = formatMoney(manualAssetValue);
        document.getElementById('flow-manual-debt-items').textContent = manualDebtNames.length ? manualDebtNames.join(' · ') : 'None entered';
        document.getElementById('flow-manual-asset-items').textContent = manualAssetNames.length ? manualAssetNames.join(' · ') : 'None entered';
        var flowNodeValues = {
          'tracked-assets': formatMoney(baseAssets), 'manual-assets': formatMoney(manualAssetValue),
          'assets-total': formatMoney(assets), 'linked-debt': formatMoney(baseLiabilities),
          'apple-debt': appleValue ? formatMoney(appleValue) : 'Not entered',
          'manual-debt': formatMoney(manualDebtValue), 'total-debt': formatMoney(liabilities), 'networth': netLabel
        };
        Object.keys(flowNodeValues).forEach(function (key) {
          var node = document.querySelector('#command [data-node="' + key + '"]');
          if (node) node.dataset.total = flowNodeValues[key];
        });
        var exposure = document.getElementById('posture-exposure');
        var totalPosition = Math.max(assets + liabilities, 1);
        exposure.querySelector('.asset').style.flex = String(assets / totalPosition);
        exposure.querySelector('.debt').style.flex = String(liabilities / totalPosition);
        exposure.setAttribute('aria-label', (assets / totalPosition * 100).toFixed(1) + ' percent assets and ' + (liabilities / totalPosition * 100).toFixed(1) + ' percent liabilities');
        if (selectedNode) renderFlowSelection(selectedNode);
      }
      var apple = document.getElementById('apple-balance');
      if (apple) apple.addEventListener('input', updateBalanceSheet);
      function renderAssets() {
        var list = document.getElementById('manual-asset-list');
        list.replaceChildren();
        if (!manualAssets.length) {
          var empty = document.createElement('li');
          empty.className = 'empty-row';
          empty.textContent = 'No manual assets or debts entered yet.';
          list.appendChild(empty);
        }
        manualAssets.forEach(function (asset, index) {
          var item = document.createElement('li');
          var name = document.createElement('span');
          var value = document.createElement('strong');
          var remove = document.createElement('button');
          name.textContent = asset.name;
          value.textContent = formatMoney(asset.value);
          value.className = asset.value < 0 ? 'negative' : 'positive';
          remove.className = 'inline-remove';
          remove.type = 'button';
          remove.textContent = 'Remove';
          remove.addEventListener('click', function () { manualAssets.splice(index, 1); renderAssets(); updateBalanceSheet(); });
          item.append(name, value, remove);
          list.appendChild(item);
        });
      }
      document.getElementById('add-asset').addEventListener('click', function () {
        var name = document.getElementById('asset-name');
        var value = document.getElementById('asset-value');
        var amount = Number(value.value);
        if (!name.value.trim() || !Number.isFinite(amount) || amount === 0 || amount < Number(value.min) || amount > Number(value.max)) return;
        manualAssets.push({ name: name.value.trim(), value: amount });
        name.value = '';
        value.value = '';
        renderAssets();
        updateBalanceSheet();
      });
      document.querySelectorAll('[data-allocation-plan]').forEach(function (plan) {
        var totalInput = plan.querySelector('.plan-total');
        var debtInput = plan.querySelector('.plan-debt');
        var investInput = plan.querySelector('.plan-invest');
        function updatePlan(source) {
          var total = Math.max(Number(totalInput.value) || Number(totalInput.min), Number(totalInput.min));
          var debtPct = Math.max(Number(debtInput.value) || Number(debtInput.min), Number(debtInput.min));
          var investPct = Math.max(Number(investInput.value) || Number(investInput.min), Number(investInput.min));
          if (source === debtInput) { investPct = Math.max(Number(investInput.min), Number(debtInput.max) - debtPct); investInput.value = investPct; }
          if (source === investInput) { debtPct = Math.max(Number(debtInput.min), Number(investInput.max) - investPct); debtInput.value = debtPct; }
          var debtAmount = total * debtPct / Number(debtInput.max);
          var investAmount = total * investPct / Number(investInput.max);
          plan.querySelector('.plan-debt-amount').textContent = formatMoney(debtAmount);
          plan.querySelector('.plan-invest-amount').textContent = formatMoney(investAmount);
          plan.querySelector('.plan-total-label').textContent = formatMoney(total);
          plan.querySelector('.plan-debt-label').textContent = formatMoney(debtAmount);
          plan.querySelector('.plan-invest-label').textContent = formatMoney(investAmount);
          plan.querySelector('.plan-status').textContent = debtPct + '% debt · ' + investPct + '% invest';
          plan.querySelector('.plan-debt-band').setAttribute('stroke-width', String(Math.max(debtPct, Number(debtInput.step))));
          plan.querySelector('.plan-invest-band').setAttribute('stroke-width', String(Math.max(investPct, Number(investInput.step))));
        }
        [totalInput, debtInput, investInput].forEach(function (input) { input.addEventListener('input', function () { updatePlan(input); }); });
        updatePlan();
      });

      var premiumEditor = document.querySelector('.premium-editor');
      var premiumSelf = document.getElementById('prem-self');
      var premiumOffice = document.getElementById('prem-office');
      function updatePremiumMath() {
        var own = Math.max(Number(premiumSelf.value) || Number(premiumSelf.min), Number(premiumSelf.min));
        var office = Math.max(Number(premiumOffice.value) || Number(premiumOffice.min), Number(premiumOffice.min));
        var ownRate = Number(premiumEditor.dataset.ownRate);
        var officeRate = Number(premiumEditor.dataset.officeRate);
        var ownQuota = Number(premiumEditor.dataset.ownQuota);
        var officeQuota = Number(premiumEditor.dataset.officeQuota);
        var ownCommission = own * ownRate;
        var officeCommission = office * officeRate;
        var commission = ownCommission + officeCommission;
        var totalPremium = own + office;
        var ownShare = commission ? ownCommission / commission * 100 : Number(premiumSelf.min);
        var officeShare = commission ? officeCommission / commission * 100 : Number(premiumOffice.min);
        var ownQuotaPct = ownQuota ? Math.min(100, own / ownQuota * 100) : Number(premiumSelf.min);
        var officeQuotaPct = officeQuota ? Math.min(100, totalPremium / officeQuota * 100) : Number(premiumOffice.min);
        document.getElementById('premium-estimate').textContent = formatMoney(commission);
        document.getElementById('premium-total').textContent = formatMoney(totalPremium);
        document.getElementById('premium-production-copy').textContent = formatMoney(own) + ' personally closed + ' + formatMoney(office) + ' additional office premium.';
        document.getElementById('commission-total').textContent = formatMoney(commission);
        document.getElementById('commission-copy').textContent = formatMoney(own) + ' own × ' + (ownRate * 100).toFixed(2) + '% = ' + formatMoney(ownCommission) + '. ' + formatMoney(office) + ' office premium × ' + (officeRate * 100).toFixed(2) + '% = ' + formatMoney(officeCommission) + '.';
        document.getElementById('commission-chart-estimate').textContent = formatMoney(commission) + ' estimate';
        var stack = document.getElementById('commission-stack');
        stack.setAttribute('aria-label', formatMoney(ownCommission) + ' own production commission and ' + formatMoney(officeCommission) + ' office override');
        stack.querySelector('.stack-own').style.width = ownShare + '%';
        stack.querySelector('.stack-override').style.width = officeShare + '%';
        document.getElementById('commission-own-legend').textContent = 'Own · ' + formatMoney(ownCommission);
        document.getElementById('commission-office-legend').textContent = 'Override · ' + formatMoney(officeCommission);
        document.getElementById('own-quota-label').textContent = 'Own · ' + formatMoney(own) + ' / ' + formatMoney(ownQuota);
        document.getElementById('office-quota-label').textContent = 'Office · ' + formatMoney(totalPremium) + ' / ' + formatMoney(officeQuota);
        document.getElementById('own-quota-bar').style.width = ownQuotaPct + '%';
        document.getElementById('office-quota-bar').style.width = officeQuotaPct + '%';
        document.getElementById('own-quota-pct').textContent = ownQuotaPct.toFixed(1).replace('.0', '') + '%';
        document.getElementById('office-quota-pct').textContent = officeQuotaPct.toFixed(1).replace('.0', '') + '%';
      }
      [premiumSelf, premiumOffice].forEach(function (input) { input.addEventListener('input', updatePremiumMath); });
      updatePremiumMath();

      var flow = document.querySelector('#command .sankey');
      var selectedNode = '';
      function renderFlowSelection(nextNode) {
        var readout = document.getElementById('flow-selection');
        selectedNode = nextNode || '';
        flow.classList.toggle('has-selection', Boolean(selectedNode));
        flow.querySelectorAll('[data-node]').forEach(function (item) {
          var active = item.dataset.node === selectedNode;
          item.classList.toggle('is-connected', !selectedNode || active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        flow.querySelectorAll('[data-edge]').forEach(function (item) {
          var connected = !selectedNode || (item.dataset.edge || '').split(/\s+/).indexOf(selectedNode) !== -1;
          item.classList.toggle('is-connected', connected);
        });
        var selected = selectedNode ? flow.querySelector('[data-node="' + selectedNode + '"]') : null;
        if (selected) {
          readout.querySelector('b').textContent = selected.dataset.label;
          readout.querySelector('span').textContent = selected.dataset.total + ' · connected flows isolated';
        } else {
          readout.querySelector('b').textContent = 'All activity + positions';
          readout.querySelector('span').textContent = 'Click a node to isolate its connected movement or balance-sheet inputs.';
        }
      }
      if (flow) {
        flow.addEventListener('click', function (event) {
          var node = event.target.closest('[data-node]');
          if (node && flow.contains(node)) renderFlowSelection(selectedNode === node.dataset.node ? '' : node.dataset.node);
          else renderFlowSelection('');
        });
        flow.addEventListener('keydown', function (event) {
          var node = event.target.closest('[data-node]');
          if (node && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            renderFlowSelection(selectedNode === node.dataset.node ? '' : node.dataset.node);
          }
        });
        renderFlowSelection('');
      }
      document.addEventListener('click', function (event) {
        var selectable = event.target.closest('.selectable');
        if (!selectable || event.target.closest('button, input, a, label')) return;
        selectable.classList.toggle('selected-card');
      });
      var dialog = document.getElementById('holding-dialog');
      rows.forEach(function (row) {
        if (row.getAttribute('data-result') === 'neutral') return;
        row.addEventListener('click', function () {
          var cells = row.querySelectorAll('td');
          var symbol = row.querySelector('.ticker').textContent;
          var now = parseMoney(cells[1].textContent);
          var entry = parseMoney(cells[3].textContent);
          var change = now - entry;
          var percentInput = document.querySelector('.plan-debt');
          var percentScale = Number(percentInput.max);
          var zero = Number(percentInput.min);
          var percent = entry ? change / entry * percentScale : zero;
          var maximum = Math.max(now, entry);
          document.getElementById('holding-title').textContent = symbol;
          document.getElementById('entry-value').textContent = formatMoney(entry);
          document.getElementById('now-value').textContent = formatMoney(now);
          document.getElementById('entry-bar').style.width = (entry / maximum * percentScale) + '%';
          document.getElementById('now-bar').style.width = (now / maximum * percentScale) + '%';
          document.getElementById('now-bar').style.background = change >= zero ? 'var(--good)' : 'var(--bad)';
          var changeNode = document.getElementById('holding-change');
          changeNode.textContent = (change >= zero ? '+' : '−') + formatMoney(Math.abs(change)) + ' · ' + (change >= zero ? '+' : '−') + Math.abs(percent).toFixed(2) + '%';
          changeNode.className = 'holding-change ' + (change >= zero ? 'positive' : 'negative');
          dialog.showModal();
        });
      });
      dialog.querySelector('.dialog-close').addEventListener('click', function () { dialog.close(); });
      dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
      var spendingData = JSON.parse(document.getElementById('spending-data').textContent);
      var transactionList = document.getElementById('transaction-list');
      function merchantInitials(name) {
        return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
      }
      function showTransactions(category) {
        var items = spendingData[category] || [];
        document.getElementById('transaction-title').textContent = category.replace(/_/g, ' ') + ' · transaction detail';
        document.getElementById('transaction-count').textContent = items.length ? items.length + ' matched rows' : 'No itemized rows';
        transactionList.replaceChildren();
        if (!items.length) {
          var empty = document.createElement('li'); empty.className = 'drawer-empty'; empty.textContent = 'No itemized merchant rows are embedded for this category in the current snapshot.'; transactionList.appendChild(empty); return;
        }
        items.forEach(function (item) {
          var row = document.createElement('li');
          var avatar = document.createElement('span'); avatar.className = 'merchant-avatar'; avatar.textContent = merchantInitials(item.merchant);
          var merchant = document.createElement('span'); merchant.textContent = item.merchant;
          var date = document.createElement('time'); date.textContent = item.date;
          var amount = document.createElement('strong'); amount.textContent = item.amount;
          row.append(avatar, merchant, date, amount); transactionList.appendChild(row);
        });
      }
      document.querySelectorAll('[data-category]').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('[data-category]').forEach(function (item) { item.classList.toggle('active', item === button); });
          showTransactions(button.dataset.category);
        });
      });
      showTransactions(document.querySelector('[data-category].active').dataset.category);

      var agendaData = JSON.parse(document.getElementById('agenda-data').textContent);
      document.querySelectorAll('.calendar-day[data-date]').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('.calendar-day').forEach(function (day) { day.classList.toggle('active', day === button); });
          var date = button.dataset.date;
          var items = agendaData[date] || [];
          document.getElementById('calendar-detail-title').textContent = date;
          var detail = document.getElementById('calendar-detail-list'); detail.replaceChildren();
          if (!items.length) { var empty = document.createElement('li'); empty.textContent = 'No synced agenda items for this day.'; detail.appendChild(empty); }
          items.forEach(function (text) { var item = document.createElement('li'); item.textContent = text; detail.appendChild(item); });
        });
      });

      var taskList = document.getElementById('task-list');
      taskList.addEventListener('change', function (event) {
        if (event.target.matches('input[type="checkbox"]')) event.target.closest('li').classList.toggle('task-done', event.target.checked);
      });
      taskList.addEventListener('click', function (event) {
        var remove = event.target.closest('.delete-task'); if (remove) remove.closest('li').remove();
      });
      document.getElementById('task-entry-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var input = document.getElementById('new-task');
        var text = input.value.trim(); if (!text) return;
        var item = document.createElement('li');
        var label = document.createElement('label');
        var box = document.createElement('input'); box.type = 'checkbox'; box.dataset.task = 'custom';
        var copy = document.createElement('span'); copy.textContent = text;
        var remove = document.createElement('button'); remove.className = 'delete-task'; remove.type = 'button'; remove.textContent = 'Delete';
        label.append(box, copy); item.append(label, remove); taskList.appendChild(item); input.value = '';
      });

      document.querySelectorAll('.bucket-button').forEach(function (button) {
        button.addEventListener('click', function () {
          var bucket = button.closest('.bucket');
          var expanded = !bucket.classList.contains('open');
          bucket.classList.toggle('open', expanded); button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
      });
      var injectedWatchlist = document.getElementById('watchlist');
      var watchTemplate = document.getElementById('watchlist-upgrade-template');
      if (!injectedWatchlist && watchTemplate) {
        injectedWatchlist = document.createElement('section');
        injectedWatchlist.className = 'view';
        injectedWatchlist.id = 'watchlist';
        injectedWatchlist.setAttribute('aria-label', 'Watchlist and January 1 plan');
        watchTemplate.parentNode.insertBefore(injectedWatchlist, watchTemplate);
      }
      if (injectedWatchlist && watchTemplate && !injectedWatchlist.querySelector('.watchlist-grid')) injectedWatchlist.appendChild(watchTemplate.content.cloneNode(true));
      var watchGrid = document.getElementById('watchlist-grid');
      function wireWatchCard(card) {
        var remove = card.querySelector('.remove-card');
        if (remove) remove.addEventListener('click', function () { card.remove(); });
        var trading = Array.from(card.children).find(function (node) { return node.tagName === 'A' && node.textContent === 'TradingView'; });
        if (trading && !card.querySelector('.schwab-trade')) {
          var links = document.createElement('div'); links.className = 'watch-links';
          trading.parentNode.insertBefore(links, trading); links.appendChild(trading);
          var schwab = document.createElement('a'); schwab.className = 'schwab-trade'; schwab.href = 'https://client.schwab.com/'; schwab.target = '_blank'; schwab.rel = 'noreferrer'; schwab.textContent = 'Trade'; links.appendChild(schwab);
        }
        if (!card.querySelector('.add-plan')) {
          var planButton = document.createElement('button'); planButton.className = 'add-plan'; planButton.type = 'button'; planButton.textContent = 'Add to plan'; card.appendChild(planButton);
        }
        card.addEventListener('dragstart', function () { card.classList.add('dragging'); });
        card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
      }
      watchGrid.querySelectorAll('.watch-card').forEach(wireWatchCard);
      watchGrid.addEventListener('dragover', function (event) {
        event.preventDefault();
        var dragging = watchGrid.querySelector('.dragging');
        if (!dragging) return;
        var after = Array.from(watchGrid.querySelectorAll('.watch-card:not(.dragging)')).find(function (card) { return event.clientY <= card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2; });
        watchGrid.insertBefore(dragging, after || null);
      });
      document.getElementById('watch-add-form').addEventListener('submit', function (event) {
        event.preventDefault();
        var tickerInput = document.getElementById('watch-ticker');
        var nameInput = document.getElementById('watch-name');
        var ticker = tickerInput.value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
        var name = nameInput.value.trim();
        if (!ticker || !name) return;
        var card = document.createElement('article');
        card.className = 'watch-card selectable';
        card.draggable = true;
        card.dataset.key = ticker;
        var remove = document.createElement('button');
        remove.className = 'remove-card'; remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + name); remove.textContent = '×';
        var title = document.createElement('h3');
        title.appendChild(document.createTextNode('$' + ticker + ' '));
        var company = document.createElement('span'); company.textContent = '— ' + name; title.appendChild(company);
        var link = document.createElement('a'); link.href = 'https://www.tradingview.com/symbols/' + ticker + '/'; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'TradingView';
        var quote = document.createElement('div'); quote.className = 'watch-quote';
        var price = document.createElement('strong'); price.textContent = '—';
        var move = document.createElement('span'); move.textContent = '—'; quote.append(price, move);
        var label = document.createElement('label');
        var field = document.createElement('span'); field.className = 'field-label'; field.textContent = 'Target price';
        var target = document.createElement('input'); target.className = 'target-input'; target.type = 'number'; target.inputMode = 'decimal'; target.dataset.symbol = ticker; target.placeholder = '—';
        label.append(field, target); card.append(remove, title, link, quote, label); watchGrid.appendChild(card); wireWatchCard(card);
        tickerInput.value = ''; nameInput.value = '';
        renderBuyingSoon();
      });

      var buyPlanDataBlock = document.getElementById('buy-plan-data');
      var buyingSoonList = document.getElementById('buying-soon-list');
      function readBuyingSoon() {
        try {
          var parsed = JSON.parse(buyPlanDataBlock.textContent || '[]');
          return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.ticker; }) : [];
        } catch (error) { return []; }
      }
      function localDateStamp() {
        var today = new Date();
        return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
      }
      function planButtonHolding(button) {
        var card = button.closest('.watch-card');
        if (card) {
          var cardTicker = String(card.dataset.key || '').toUpperCase();
          var cardName = card.querySelector('h3 span');
          return { ticker: cardTicker, name: cardName ? cardName.textContent.replace(/^\s*[—-]\s*/, '').trim() : cardTicker };
        }
        var row = button.closest('li');
        var tickerNode = row ? row.querySelector('b') : null;
        var ticker = tickerNode ? tickerNode.textContent.replace(/^\$/, '').trim().toUpperCase() : '';
        var copy = row ? row.querySelector('span') : null;
        var name = copy ? copy.textContent.split('·').slice(1).join('·').trim() : ticker;
        return { ticker: ticker, name: name || ticker };
      }
      function renderBuyingSoon() {
        var plan = readBuyingSoon();
        buyingSoonList.replaceChildren();
        document.getElementById('buying-soon-count').textContent = plan.length + ' position' + (plan.length === 1 ? '' : 's');
        if (!plan.length) {
          var empty = document.createElement('li'); empty.className = 'buying-soon-empty'; empty.textContent = 'Nothing queued yet. Use Add to plan from Watchlist.'; buyingSoonList.appendChild(empty);
        }
        plan.forEach(function (item) {
          var row = document.createElement('li'); row.className = 'buying-soon-row';
          var ticker = document.createElement('span'); ticker.className = 'plan-ticker'; ticker.textContent = '$' + String(item.ticker).toUpperCase();
          var name = document.createElement('span'); name.className = 'plan-name'; name.textContent = item.name || item.ticker;
          var target = document.createElement('strong'); target.className = 'plan-target positive';
          var targetNumber = Number(item.target); target.textContent = item.target !== '' && Number.isFinite(targetNumber) ? formatMoney(targetNumber) : '—';
          var date = document.createElement('time'); date.dateTime = item.addedAt || ''; date.textContent = item.addedAt || '—';
          var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'buying-soon-remove'; remove.setAttribute('aria-label', 'Remove ' + (item.name || item.ticker) + ' from buying soon'); remove.textContent = '×';
          remove.addEventListener('click', function () {
            var next = readBuyingSoon().filter(function (entry) { return String(entry.ticker).toUpperCase() !== String(item.ticker).toUpperCase(); });
            buyPlanDataBlock.textContent = JSON.stringify(next); renderBuyingSoon();
          });
          row.append(ticker, name, target, date, remove); buyingSoonList.appendChild(row);
        });
        var selected = plan.map(function (item) { return String(item.ticker).toUpperCase(); });
        injectedWatchlist.querySelectorAll('.add-plan').forEach(function (button) {
          var holding = planButtonHolding(button); var added = selected.indexOf(holding.ticker) !== -1;
          button.classList.toggle('added', added); button.textContent = added ? 'Added' : 'Add to plan'; button.setAttribute('aria-pressed', added ? 'true' : 'false'); button.setAttribute('aria-label', (added ? 'Added ' : 'Add ') + holding.ticker + ' to plan');
        });
      }
      window.renderBuyingSoon = renderBuyingSoon;
      window.__buyPlanImport = function (arr) { buyPlanDataBlock.textContent = JSON.stringify(arr || []); renderBuyingSoon(); };
      injectedWatchlist.addEventListener('click', function (event) {
        var button = event.target.closest('.add-plan');
        if (!button || !injectedWatchlist.contains(button)) return;
        var holding = planButtonHolding(button); if (!holding.ticker) return;
        var targetInput = Array.from(watchGrid.querySelectorAll('.target-input')).find(function (input) { return String(input.dataset.symbol || '').toUpperCase() === holding.ticker; });
        var next = readBuyingSoon();
        var entry = { ticker: holding.ticker, name: holding.name, target: targetInput ? targetInput.value.trim() : '', addedAt: localDateStamp() };
        var existingIndex = next.findIndex(function (item) { return String(item.ticker).toUpperCase() === holding.ticker; });
        if (existingIndex === -1) next.push(entry); else next[existingIndex] = entry;
        buyPlanDataBlock.textContent = JSON.stringify(next); renderBuyingSoon();
      });
      try { window.__buyPlanImport(JSON.parse(buyPlanDataBlock.textContent || '[]')); } catch (error) { window.__buyPlanImport([]); }

      var intelSection = document.getElementById('intelligence');
      var intelSavedDataBlock = document.getElementById('intel-saved-data');
      var wireCurrent = document.getElementById('wire-current');
      var wireArchive = document.getElementById('wire-archive');
      var wireArchiveFeed = document.getElementById('wire-archive-feed');
      var wireFilter = 'all';
      var wireLinks = Array.from(wireCurrent.querySelectorAll('.wire-link'));
      var expiryWindow = 30 * 24 * 60 * 60 * 1000;
      wireLinks.forEach(function (link, index) {
        var article = link.querySelector('.wire-item');
        article.dataset.wcat = article.dataset.wcat || 'markets';
        article.dataset.wid = article.dataset.wid || ('wire-' + (index + 1));
        var bookmark = document.createElement('button'); bookmark.type = 'button'; bookmark.className = 'wire-bookmark'; bookmark.textContent = 'Save'; bookmark.setAttribute('aria-label', 'Save ' + article.querySelector('h3').textContent);
        bookmark.addEventListener('click', function (event) {
          event.preventDefault(); event.stopPropagation();
          var saved = readIntelSaved(); var savedIndex = saved.indexOf(article.dataset.wid);
          if (savedIndex === -1) saved.push(article.dataset.wid); else saved.splice(savedIndex, 1);
          intelSavedDataBlock.textContent = JSON.stringify(saved); renderIntelSaved();
        });
        article.appendChild(bookmark);
        var time = article.querySelector('time[datetime]');
        var published = time ? new Date(time.getAttribute('datetime') + 'T00:00:00') : null;
        var expired = published && !Number.isNaN(published.getTime()) && (Date.now() - published.getTime() > expiryWindow);
        article.dataset.expired = expired ? 'true' : 'false';
        if (expired) {
          var badge = document.createElement('span'); badge.className = 'expired-badge'; badge.textContent = 'Expired'; article.querySelector('.wire-meta').appendChild(badge);
          wireArchiveFeed.appendChild(link);
        }
      });
      function readIntelSaved() {
        try {
          var parsed = JSON.parse(intelSavedDataBlock.textContent || '[]');
          return Array.isArray(parsed) ? parsed.filter(function (item) { return typeof item === 'string'; }) : [];
        } catch (error) { return []; }
      }
      function renderIntelSaved() {
        var saved = readIntelSaved(); var currentVisible = 0; var archiveVisible = 0; var archiveTotal = 0;
        wireLinks.forEach(function (link) {
          var article = link.querySelector('.wire-item'); var isSaved = saved.indexOf(article.dataset.wid) !== -1;
          var bookmark = article.querySelector('.wire-bookmark');
          bookmark.classList.toggle('saved', isSaved); bookmark.textContent = isSaved ? 'Saved' : 'Save'; bookmark.setAttribute('aria-pressed', isSaved ? 'true' : 'false'); bookmark.setAttribute('aria-label', (isSaved ? 'Remove ' : 'Save ') + article.querySelector('h3').textContent);
          var visible = wireFilter === 'all' || wireFilter === article.dataset.wcat || (wireFilter === 'saved' && isSaved);
          link.hidden = !visible;
          if (article.dataset.expired === 'true') { archiveTotal += 1; if (visible) archiveVisible += 1; }
          else if (visible) currentVisible += 1;
        });
        document.getElementById('wire-archive-summary').textContent = 'Archive · ' + archiveTotal;
        wireArchive.hidden = archiveVisible === 0;
        if (wireFilter === 'saved' && archiveVisible > 0 && currentVisible === 0) wireArchive.open = true;
        document.getElementById('wire-empty').hidden = currentVisible + archiveVisible > 0;
      }
      window.renderIntelSaved = renderIntelSaved;
      window.__intelSavedImport = function (arr) { intelSavedDataBlock.textContent = JSON.stringify(arr || []); renderIntelSaved(); };
      document.getElementById('wire-filters').addEventListener('click', function (event) {
        var button = event.target.closest('[data-wire-filter]'); if (!button) return;
        wireFilter = button.dataset.wireFilter;
        document.querySelectorAll('[data-wire-filter]').forEach(function (item) { var active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', active ? 'true' : 'false'); });
        renderIntelSaved();
      });
      try { window.__intelSavedImport(JSON.parse(intelSavedDataBlock.textContent || '[]')); } catch (error) { window.__intelSavedImport([]); }

      function parseCsv(text) {
        var grid = [];
        var row = [];
        var field = '';
        var quoted = false;
        for (var index = 0; index < text.length; index += 1) {
          var character = text[index];
          var following = text[index + 1];
          if (character === '"' && quoted && following === '"') { field += '"'; index += 1; }
          else if (character === '"') quoted = !quoted;
          else if (character === ',' && !quoted) { row.push(field); field = ''; }
          else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && following === '\n') index += 1;
            row.push(field); field = '';
            if (row.some(function (cell) { return cell.trim(); })) grid.push(row);
            row = [];
          } else field += character;
        }
        row.push(field);
        if (row.some(function (cell) { return cell.trim(); })) grid.push(row);
        return grid;
      }
      function normalizedHeader(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
      function findHeader(headers, candidates) {
        var normalized = headers.map(normalizedHeader);
        for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
          var exact = normalized.indexOf(candidates[candidateIndex]);
          if (exact !== -1) return exact;
        }
        for (var headerIndex = 0; headerIndex < normalized.length; headerIndex += 1) {
          if (candidates.some(function (candidate) { return normalized[headerIndex].indexOf(candidate) !== -1; })) return headerIndex;
        }
        return -1;
      }
      function normalizeCsvRows(grid, sourceName) {
        if (grid.length < 2) return [];
        var headers = grid[0].map(function (header) { return header.trim(); });
        var locations = {
          date: findHeader(headers, ['date', 'startdate', 'starttime', 'workoutdate', 'activitydate', 'timestamp', 'day']),
          activity: findHeader(headers, ['activity', 'activitytype', 'workout', 'workoutname', 'exercise', 'exercisename', 'type', 'description', 'meal', 'food']),
          calories: findHeader(headers, ['calories', 'calorie', 'energyburned', 'caloriesburned', 'kcal']),
          duration: findHeader(headers, ['duration', 'workoutduration', 'activityduration', 'minutes', 'elapsedtime']),
          strain: findHeader(headers, ['strain', 'daystrain', 'activitystrain']),
          recovery: findHeader(headers, ['recovery', 'recoveryscore', 'recoverypercentage'])
        };
        return grid.slice(1).filter(function (cells) { return cells.some(function (cell) { return cell.trim(); }); }).map(function (cells) {
          var raw = {};
          headers.forEach(function (header, cellIndex) { raw[header || ('Column ' + (cellIndex + 1))] = (cells[cellIndex] || '').trim(); });
          function valueAt(location) { return location >= 0 ? (cells[location] || '').trim() : ''; }
          return {
            date: valueAt(locations.date), activity: valueAt(locations.activity), calories: valueAt(locations.calories),
            duration: valueAt(locations.duration), strain: valueAt(locations.strain), recovery: valueAt(locations.recovery),
            source: sourceName || 'CSV import', raw: raw
          };
        });
      }
      function displayDate(value) {
        if (!value) return '—';
        var parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      function renderBodyCsv(rows) {
        var dataBlock = document.getElementById('body-csv-data');
        var emptyState = document.getElementById('body-csv-empty');
        var summary = document.getElementById('body-csv-summary');
        var results = document.getElementById('body-csv-results');
        var tableBody = document.getElementById('body-csv-rows');
        dataBlock.textContent = JSON.stringify(rows);
        tableBody.replaceChildren();
        if (!rows.length) {
          emptyState.hidden = false;
          summary.classList.remove('is-visible');
          results.hidden = true;
          document.getElementById('body-csv-count').textContent = '0';
          document.getElementById('body-csv-range').textContent = '—';
          return;
        }
        emptyState.hidden = true;
        summary.classList.add('is-visible');
        results.hidden = false;
        document.getElementById('body-csv-count').textContent = String(rows.length);
        var dated = rows.map(function (item) { return new Date(item.date); }).filter(function (date) { return !Number.isNaN(date.getTime()); }).sort(function (a, b) { return a - b; });
        document.getElementById('body-csv-range').textContent = dated.length ? displayDate(dated[0]) + ' — ' + displayDate(dated[dated.length - 1]) : 'Dates not detected';
        document.getElementById('body-csv-source').textContent = rows[0].source || 'CSV import';
        rows.slice().sort(function (a, b) {
          var first = new Date(a.date).getTime(); var second = new Date(b.date).getTime();
          if (Number.isNaN(first) || Number.isNaN(second)) return 0;
          return second - first;
        }).slice(0, 20).forEach(function (item) {
          var entry = document.createElement('tr');
          var date = document.createElement('td'); date.dataset.label = 'Date'; date.textContent = displayDate(item.date);
          var activity = document.createElement('td'); activity.dataset.label = 'Activity'; activity.textContent = item.activity || 'Entry';
          var metrics = document.createElement('td'); metrics.dataset.label = 'Key metrics'; metrics.className = 'metric-list';
          [['Calories', item.calories], ['Duration', item.duration], ['Strain', item.strain], ['Recovery', item.recovery]].forEach(function (metric) {
            if (!metric[1]) return;
            var pair = document.createElement('span'); var label = document.createElement('b'); label.textContent = metric[0] + ': ';
            pair.append(label, document.createTextNode(metric[1])); metrics.appendChild(pair);
          });
          if (!metrics.childNodes.length) metrics.textContent = 'No key metrics detected';
          entry.append(date, activity, metrics); tableBody.appendChild(entry);
        });
      }
      window.__bodyCsvImport = function (rows) { renderBodyCsv(Array.isArray(rows) ? rows : []); };
      document.getElementById('body-csv-file').addEventListener('change', function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        file.text().then(function (text) { window.__bodyCsvImport(normalizeCsvRows(parseCsv(text), file.name)); });
      });
      document.getElementById('body-csv-clear').addEventListener('click', function () {
        document.getElementById('body-csv-file').value = '';
        window.__bodyCsvImport([]);
      });
      try { window.__bodyCsvImport(JSON.parse(document.getElementById('body-csv-data').textContent || '[]')); }
      catch (error) { window.__bodyCsvImport([]); }

      var talentStages = ['Targeted', 'Contacted', 'Interviewing', 'Offer', 'Hired', 'Archived'];
      var talentDataBlock = document.getElementById('talent-data');
      var talentRecords = [];
      var talentBoard = document.getElementById('talent-board');
      var talentEditor = document.getElementById('talent-editor');
      var talentForm = document.getElementById('talent-editor-form');
      var selectedTalentNode = '';
      function talentSlug(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
      function commitTalent() {
        talentDataBlock.textContent = JSON.stringify(talentRecords);
        renderTalentBoard();
        renderTalentNetwork();
      }
      function openTalentEditor(record) {
        var editing = record || null;
        document.getElementById('talent-editor-title').textContent = editing ? 'Edit person' : 'Add person';
        document.getElementById('talent-id').value = editing ? editing.id : '';
        document.getElementById('talent-name').value = editing ? editing.name : '';
        document.getElementById('talent-company').value = editing ? editing.company : '';
        document.getElementById('talent-role').value = editing ? editing.role : '';
        document.getElementById('talent-stage').value = editing ? editing.stage : talentStages[0];
        document.getElementById('talent-source').value = editing ? editing.source : '';
        document.getElementById('talent-date').value = editing ? editing.dateAdded : new Date().toISOString().slice(0, 10);
        document.getElementById('talent-notes').value = editing ? editing.notes : '';
        document.getElementById('talent-delete').hidden = !editing;
        talentEditor.showModal();
        window.setTimeout(function () { document.getElementById('talent-name').focus(); }, 0);
      }
      function renderTalentBoard() {
        talentBoard.replaceChildren();
        talentStages.forEach(function (stage) {
          var column = document.createElement('section'); column.className = 'talent-column'; column.dataset.stage = stage;
          var header = document.createElement('header'); header.className = 'talent-column-head';
          var heading = document.createElement('h3'); heading.textContent = stage;
          var count = document.createElement('span'); count.textContent = String(talentRecords.filter(function (item) { return item.stage === stage; }).length);
          header.append(heading, count);
          var cards = document.createElement('div'); cards.className = 'talent-cards';
          talentRecords.filter(function (item) { return item.stage === stage; }).forEach(function (record) {
            var card = document.createElement('article'); card.className = 'talent-card' + (record.example ? ' talent-card-example' : ''); card.setAttribute('data-talent-id', record.id); card.draggable = true;
            if (record.example) { var flag = document.createElement('span'); flag.className = 'example-flag'; flag.textContent = 'Example · delete anytime'; card.appendChild(flag); }
            var name = document.createElement('h4'); name.textContent = record.name;
            var company = document.createElement('div'); company.className = 'talent-company'; company.textContent = record.company;
            var role = document.createElement('p'); role.className = 'talent-role'; role.textContent = record.role;
            var startDate = null;
            if (record.startDate) { startDate = document.createElement('p'); startDate.className = 'talent-start'; startDate.textContent = 'Start · ' + record.startDate; }
            var meta = document.createElement('p'); meta.className = 'talent-meta'; meta.textContent = (record.source || 'Source not set') + ' · added ' + (record.dateAdded || '—');
            var notes = document.createElement('p'); notes.className = 'talent-notes'; notes.textContent = record.notes || 'No notes yet.';
            var actions = document.createElement('div'); actions.className = 'talent-card-actions';
            var stageSelect = document.createElement('select'); stageSelect.setAttribute('aria-label', 'Move ' + record.name + ' to stage'); stageSelect.dataset.talentId = record.id; stageSelect.dataset.talentAction = 'move';
            talentStages.forEach(function (optionStage) { var option = document.createElement('option'); option.value = optionStage; option.textContent = optionStage; option.selected = optionStage === record.stage; stageSelect.appendChild(option); });
            stageSelect.addEventListener('change', function () { record.stage = stageSelect.value; commitTalent(); });
            var edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit'; edit.dataset.talentId = record.id; edit.dataset.talentAction = 'edit'; edit.addEventListener('click', function () { openTalentEditor(record); });
            actions.append(stageSelect, edit);
            card.append(name, company, role);
            if (startDate) card.appendChild(startDate);
            card.append(meta, notes, actions);
            card.addEventListener('dragstart', function () { card.classList.add('dragging'); card.dataset.dragging = 'true'; });
            card.addEventListener('dragend', function () { card.classList.remove('dragging'); delete card.dataset.dragging; });
            cards.appendChild(card);
          });
          column.addEventListener('dragover', function (event) { event.preventDefault(); column.classList.add('is-over'); });
          column.addEventListener('dragleave', function () { column.classList.remove('is-over'); });
          column.addEventListener('drop', function (event) {
            event.preventDefault(); column.classList.remove('is-over');
            var dragging = talentBoard.querySelector('[data-dragging="true"]');
            if (!dragging) return;
            var record = talentRecords.find(function (item) { return item.id === dragging.dataset.talentId; });
            if (record && record.stage !== stage) { record.stage = stage; commitTalent(); }
          });
          column.append(header, cards); talentBoard.appendChild(column);
        });
      }
      function svgNode(name, attributes) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, String(attributes[key])); });
        return node;
      }
      function renderTalentNetwork() {
        var svg = document.getElementById('talent-network-svg');
        if (!svg) return;
        svg.replaceChildren();
        var companies = [];
        talentRecords.forEach(function (record) { if (companies.indexOf(record.company) === -1) companies.push(record.company); });
        if (!companies.length) {
          var empty = svgNode('text', { x: 600, y: 310, 'text-anchor': 'middle', fill: 'currentColor' }); empty.textContent = 'Add a person to map the network.'; svg.appendChild(empty); return;
        }
        var companyPositions = {};
        var columns = Math.min(4, Math.max(1, companies.length));
        var rowsNeeded = Math.ceil(companies.length / columns);
        companies.forEach(function (company, index) {
          var col = index % columns; var row = Math.floor(index / columns);
          companyPositions[company] = {
            x: columns === 1 ? 600 : 150 + col * (900 / (columns - 1)),
            y: rowsNeeded === 1 ? 310 : 145 + row * (330 / (rowsNeeded - 1))
          };
        });
        var personPositions = {};
        companies.forEach(function (company) {
          var people = talentRecords.filter(function (record) { return record.company === company; });
          people.forEach(function (record, index) {
            var angle = (Math.PI * 2 * index / Math.max(people.length, 3)) + Math.PI / 5;
            personPositions[record.id] = { x: companyPositions[company].x + Math.cos(angle) * 92, y: companyPositions[company].y + Math.sin(angle) * 82 };
          });
        });
        talentRecords.forEach(function (record) {
          var start = companyPositions[record.company]; var end = personPositions[record.id];
          var edge = svgNode('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, 'class': 'talent-edge', 'data-company': record.company, 'data-person': record.id }); svg.appendChild(edge);
        });
        companies.forEach(function (company) {
          var position = companyPositions[company]; var key = 'company:' + company;
          var group = svgNode('g', { 'class': 'talent-node company', 'data-node-key': key, tabindex: '0', role: 'button' });
          group.appendChild(svgNode('circle', { cx: position.x, cy: position.y, r: 28 }));
          var text = svgNode('text', { x: position.x, y: position.y + 48, 'text-anchor': 'middle' }); text.textContent = company; group.appendChild(text); svg.appendChild(group);
        });
        talentRecords.forEach(function (record) {
          var position = personPositions[record.id]; var key = 'person:' + record.id;
          var group = svgNode('g', { 'class': 'talent-node person stage-' + talentSlug(record.stage), 'data-node-key': key, tabindex: '0', role: 'button' });
          group.appendChild(svgNode('circle', { cx: position.x, cy: position.y, r: 16 }));
          var text = svgNode('text', { x: position.x, y: position.y + 34, 'text-anchor': 'middle' }); text.textContent = record.name.replace('Example — ', ''); group.appendChild(text); svg.appendChild(group);
        });
        applyTalentNetworkSelection(selectedTalentNode);
      }
      function applyTalentNetworkSelection(key) {
        var panel = document.getElementById('talent-network-panel'); var svg = document.getElementById('talent-network-svg');
        selectedTalentNode = key || '';
        panel.classList.toggle('has-selection', Boolean(selectedTalentNode));
        var connectedPeople = []; var connectedCompanies = [];
        if (selectedTalentNode.indexOf('company:') === 0) {
          var company = selectedTalentNode.slice(8); connectedCompanies.push(company);
          talentRecords.filter(function (record) { return record.company === company; }).forEach(function (record) { connectedPeople.push(record.id); });
          document.getElementById('talent-network-title').textContent = company;
          document.getElementById('talent-network-detail').textContent = connectedPeople.length + ' person' + (connectedPeople.length === 1 ? '' : 's') + ' in this pipeline.';
        } else if (selectedTalentNode.indexOf('person:') === 0) {
          var id = selectedTalentNode.slice(7); var record = talentRecords.find(function (item) { return item.id === id; });
          if (record) { connectedPeople.push(record.id); connectedCompanies.push(record.company); document.getElementById('talent-network-title').textContent = record.name; document.getElementById('talent-network-detail').textContent = record.role + ' · ' + record.company + ' · ' + record.stage; }
        } else {
          document.getElementById('talent-network-title').textContent = 'All connections';
          document.getElementById('talent-network-detail').textContent = 'Companies are larger; people are colored by stage.';
        }
        svg.querySelectorAll('.talent-node').forEach(function (node) {
          var nodeKey = node.dataset.nodeKey; var connected = !selectedTalentNode || nodeKey === selectedTalentNode || (nodeKey.indexOf('company:') === 0 && connectedCompanies.indexOf(nodeKey.slice(8)) !== -1) || (nodeKey.indexOf('person:') === 0 && connectedPeople.indexOf(nodeKey.slice(7)) !== -1);
          node.classList.toggle('is-connected', connected);
        });
        svg.querySelectorAll('.talent-edge').forEach(function (edge) { edge.classList.toggle('is-connected', !selectedTalentNode || (connectedCompanies.indexOf(edge.dataset.company) !== -1 && connectedPeople.indexOf(edge.dataset.person) !== -1)); });
      }
      window.__talentImport = function (records) { talentRecords = Array.isArray(records) ? records : []; selectedTalentNode = ''; renderTalentBoard(); renderTalentNetwork(); };
      try { window.__talentImport(JSON.parse(talentDataBlock.textContent || '[]')); } catch (error) { window.__talentImport([]); }
      document.getElementById('add-talent').addEventListener('click', function () { openTalentEditor(); });
      document.getElementById('talent-editor-close').addEventListener('click', function () { talentEditor.close(); });
      document.getElementById('talent-delete').addEventListener('click', function () {
        var id = document.getElementById('talent-id').value;
        talentRecords = talentRecords.filter(function (item) { return item.id !== id; }); talentEditor.close(); commitTalent();
      });
      talentForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var id = document.getElementById('talent-id').value;
        var existing = talentRecords.find(function (item) { return item.id === id; });
        var record = existing || { id: 'talent-' + Date.now().toString(36), example: false };
        record.name = document.getElementById('talent-name').value.trim(); record.company = document.getElementById('talent-company').value.trim();
        record.role = document.getElementById('talent-role').value.trim(); record.stage = document.getElementById('talent-stage').value;
        record.source = document.getElementById('talent-source').value.trim(); record.dateAdded = document.getElementById('talent-date').value;
        record.notes = document.getElementById('talent-notes').value.trim(); record.example = existing ? Boolean(existing.example) : false;
        if (!existing) talentRecords.push(record); talentEditor.close(); commitTalent();
      });
      document.getElementById('talent-pipeline-toggle').addEventListener('click', function () { setTalentView('pipeline'); });
      document.getElementById('talent-network-toggle').addEventListener('click', function () { setTalentView('network'); });
      function setTalentView(view) {
        var networkActive = view === 'network';
        document.getElementById('talent-pipeline-view').hidden = networkActive; document.getElementById('talent-network-view').hidden = !networkActive;
        document.getElementById('talent-pipeline-toggle').classList.toggle('active', !networkActive); document.getElementById('talent-network-toggle').classList.toggle('active', networkActive);
        document.getElementById('talent-pipeline-toggle').setAttribute('aria-pressed', networkActive ? 'false' : 'true'); document.getElementById('talent-network-toggle').setAttribute('aria-pressed', networkActive ? 'true' : 'false');
        if (networkActive) renderTalentNetwork();
      }
      document.getElementById('talent-network-svg').addEventListener('click', function (event) { var node = event.target.closest('.talent-node'); applyTalentNetworkSelection(node ? (selectedTalentNode === node.dataset.nodeKey ? '' : node.dataset.nodeKey) : ''); });
      document.getElementById('talent-network-svg').addEventListener('keydown', function (event) { var node = event.target.closest('.talent-node'); if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); applyTalentNetworkSelection(selectedTalentNode === node.dataset.nodeKey ? '' : node.dataset.nodeKey); } });

      var officePlaces = [
        { label:'1518 Walnut', address:'1518 Walnut St', locality:'Philadelphia', region:'PA', lat:39.94955, lng:-75.16692, size:'1,946 SF', rent:'$3,730/mo', fit:'Comfortable · 162 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1518%20Walnut%2C%201518%20Walnut%20St%2C%20Philadelphia%2C%20PA' },
        { label:'1500 Walnut', address:'1500 Walnut St', locality:'Philadelphia', region:'PA', lat:39.94919, lng:-75.16630, size:'1,979 SF', rent:'$3,752/mo', fit:'Comfortable · 165 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1500%20Walnut%2C%201500%20Walnut%20St%2C%20Philadelphia%2C%20PA' },
        { label:'1528 Walnut · Suite 1400', address:'1528 Walnut St', locality:'Philadelphia', region:'PA', lat:39.94964, lng:-75.16742, size:'1,605 SF', rent:'$3,544/mo', fit:'Tight · 134 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1528%20Walnut%2C%201528%20Walnut%20St%2C%20Philadelphia%2C%20PA' },
        { label:'1420 Walnut', address:'1420 Walnut St', locality:'Philadelphia', region:'PA', lat:39.94932, lng:-75.16539, size:'1,500 SF', rent:'$3,250/mo', fit:'Tight · 125 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1420%20Walnut%2C%201420%20Walnut%20St%2C%20Philadelphia%2C%20PA' },
        { label:'1520 Locust · 10th floor', address:'1520 Locust St', locality:'Philadelphia', region:'PA', lat:39.94829, lng:-75.16719, size:'1,900 SF', rent:'$3,721/mo', fit:'Comfortable · 158 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1520%20Locust%2C%201520%20Locust%20St%2C%20Philadelphia%2C%20PA' },
        { label:'2133 Arch · Mulberry Atrium', address:'2133 Arch St', locality:'Philadelphia', region:'PA', lat:39.95623, lng:-75.17590, size:'1,104 SF', rent:'$2,438/mo', fit:'Below target · 92 SF/person', link:'https://www.google.com/maps/search/?api=1&query=2133%20Arch%2C%202133%20Arch%20St%2C%20Philadelphia%2C%20PA' },
        { label:'255 S 17th · 13th floor', address:'255 S 17th St', locality:'Philadelphia', region:'PA', lat:39.94827, lng:-75.16941, size:'1,016 SF', rent:'$2,201/mo', fit:'Below target · 85 SF/person', link:'https://www.google.com/maps/search/?api=1&query=255%20S%2017th%2C%20255%20S%2017th%20St%2C%20Philadelphia%2C%20PA' },
        { label:'1601 Walnut', address:'1601 Walnut St', locality:'Philadelphia', region:'PA', lat:39.95000, lng:-75.16769, size:'~1,500 SF', rent:'~$3,250/mo', fit:'Tight · ~125 SF/person', link:'https://www.google.com/maps/search/?api=1&query=1601%20Walnut%2C%201601%20Walnut%20St%2C%20Philadelphia%2C%20PA' }
      ];
      var officeMapInstance = null;
      function selectOffice(index, scroll) {
        if (index === null || index < 0 || index >= officePlaces.length) {
          document.querySelectorAll('.office-card').forEach(function (card) { card.classList.remove('map-selected'); });
          return;
        }
        var place = officePlaces[index];
        document.getElementById('office-selected-number').textContent = String(index + 1);
        document.getElementById('office-selected-title').textContent = place.label;
        document.getElementById('office-selected-address').textContent = place.address + ' · Philadelphia, PA';
        document.getElementById('office-selected-size').textContent = place.size;
        document.getElementById('office-selected-rent').textContent = place.rent;
        document.getElementById('office-selected-fit').textContent = place.fit;
        document.getElementById('office-selected-link').href = place.link;
        document.querySelectorAll('.office-card').forEach(function (card, cardIndex) { card.classList.toggle('map-selected', cardIndex === index); });
        if (scroll) {
          var card = document.querySelector('.office-card[data-office-index="' + index + '"]');
          if (card) card.scrollIntoView({ block:'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      }
      function initOfficeMap() {
        if (officeMapInstance || !document.getElementById('career').classList.contains('active')) return;
        var mapElement = document.getElementById('office-map');
        if (!window.L) {
          mapElement.innerHTML = '<div class="map-fallback">Interactive map unavailable. Use the eight property cards and their building links below.</div>';
          return;
        }
        var map = L.map('office-map', { scrollWheelZoom: false }).setView([39.9505, -75.1685], 15);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri', maxZoom: 19
        }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        }).addTo(map);
        var markers = officePlaces.map(function (p, i) {
          var icon = L.divIcon({ className: '', html: '<div class="pin" data-pin="' + i + '">' + (i + 1) + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
          var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
          m.bindPopup('<strong>' + p.label + '</strong><br>' + p.size + ' &middot; ' + p.rent + '<br><a href="' + p.link + '" target="_blank" rel="noreferrer">Open in Maps</a>');
          m.on('click', function () { selectOffice(i, true); highlightPin(i); });
          return m;
        });
        function highlightPin(idx) {
          markers.forEach(function (m, j) {
            var el = m.getElement();
            if (el) { var pin = el.querySelector('.pin'); if (pin) pin.classList.toggle('pin--on', j === idx); }
          });
        }
        officeMapInstance = {
          selectPlace: function (index) {
            if (index == null || !markers[index]) return;
            map.panTo(markers[index].getLatLng());
            markers[index].openPopup();
            highlightPin(index);
          }
        };
        officeMapInstance.selectPlace(0);
        selectOffice(0, false);
        setTimeout(function () { map.invalidateSize(); }, 120);
      }
      document.querySelectorAll('.office-card').forEach(function (card) {
        function choose() { var index = Number(card.getAttribute('data-office-index')); if (officeMapInstance) officeMapInstance.selectPlace(index); selectOffice(index, false); }
        card.addEventListener('click', choose);
        card.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } });
      });

      var currency0 = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
      function renderCommissionOutlook() {
        var rows = Array.prototype.slice.call(document.querySelectorAll('.forecast-row'));
        var rate = Math.max(0, Number(document.getElementById('commission-rate').value) || 0) / 100;
        var downPayment = Math.max(0.01, Number(document.getElementById('commission-down-payment').value) || 17.5) / 100;
        var points = [{ label:'Q3 2026', value:13646.59, actual:true, entered:true }];
        rows.forEach(function (row) {
          var existingInput = row.querySelector('.forecast-existing');
          var newInput = row.querySelector('.forecast-new');
          var entered = existingInput.value !== '' || newInput.value !== '';
          var existingCash = Math.max(0, Number(existingInput.value) || 0);
          var newCash = Math.max(0, Number(newInput.value) || 0);
          var totalCash = existingCash + newCash;
          var impliedPremium = newCash / downPayment;
          var commission = totalCash * rate;
          row.querySelector('.forecast-cash').textContent = entered ? currency0.format(totalCash) : '—';
          row.querySelector('.forecast-premium').textContent = entered ? currency0.format(impliedPremium) : '—';
          row.querySelector('.forecast-commission').textContent = entered ? currency0.format(commission) : '—';
          points.push({ label:row.querySelector('.forecast-quarter').value.trim() || 'Forecast', value:commission, actual:false, entered:entered });
        });
        var svg = document.getElementById('commission-chart');
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var ns = 'http://www.w3.org/2000/svg';
        function node(name, attrs, text) { var element = document.createElementNS(ns, name); Object.keys(attrs || {}).forEach(function (key) { element.setAttribute(key, attrs[key]); }); if (text !== undefined) element.textContent = text; svg.appendChild(element); return element; }
        var maxValue = Math.max.apply(Math, points.filter(function (point) { return point.entered; }).map(function (point) { return point.value; }).concat([13646.59]));
        var axisMax = Math.max(15000, Math.ceil(maxValue / 5000) * 5000);
        var baseline = 242; var top = 30; var height = baseline - top;
        [0,.5,1].forEach(function (ratio) { var y = baseline - height * ratio; node('line',{ x1:48,y1:y,x2:742,y2:y,class:'grid' }); node('text',{ x:4,y:y+4 }, currency0.format(axisMax * ratio)); });
        var centers = [112,258,404,550,696]; var linePoints = [];
        points.forEach(function (point, index) {
          var barHeight = point.entered ? Math.max(point.value > 0 ? 3 : 0, point.value / axisMax * height) : 6;
          var y = baseline - barHeight;
          node('rect',{ x:centers[index]-32,y:y,width:64,height:barHeight,class:point.actual?'bar-actual':'bar-forecast',opacity:point.entered?'1':'.34' });
          if (point.entered) { node('text',{ x:centers[index],y:Math.max(18,y-9),'text-anchor':'middle' }, currency0.format(point.value)); linePoints.push([centers[index], y]); }
          else node('text',{ x:centers[index],y:baseline-11,'text-anchor':'middle' }, 'enter inputs');
          node('text',{ x:centers[index],y:267,'text-anchor':'middle' }, point.label.slice(0,13));
          node('text',{ x:centers[index],y:283,'text-anchor':'middle' }, point.actual ? 'actual' : 'forecast');
        });
        if (linePoints.length > 1) node('polyline',{ points:linePoints.map(function (point) { return point.join(','); }).join(' '),class:'forecast-line' });
        linePoints.forEach(function (point) { node('circle',{ cx:point[0],cy:point[1],r:4,class:'forecast-dot' }); });
      }
      document.getElementById('commission-outlook').addEventListener('input', renderCommissionOutlook);
      renderCommissionOutlook();

      function updateDallasCosts() {
        ['living','highrise'].forEach(function (group) {
          var inputs = Array.prototype.slice.call(document.querySelectorAll('[data-cost-group="' + group + '"]'));
          var entered = inputs.some(function (input) { return input.value !== ''; });
          var total = inputs.reduce(function (sum, input) { return sum + Math.max(0, Number(input.value) || 0); }, 0);
          document.getElementById(group + '-cost-total').textContent = entered ? currency0.format(total) + '/mo' : '—';
        });
      }
      document.getElementById('dallas-costs').addEventListener('input', updateDallasCosts);

      var commandPalette = document.getElementById('command-palette');
      var commandSearch = document.getElementById('command-search');
      var commandResults = document.getElementById('command-results');
      var commandSelection = 0;
      var commandItems = [
        { label: 'Command', detail: 'Situation report and balance sheet', type: 'Tab', run: function () { activate('command'); } },
        { label: 'Money', detail: 'Banking, debt and spending', type: 'Tab', run: function () { activate('money'); } },
        { label: 'Capital', detail: 'Holdings and performance', type: 'Tab', run: function () { activate('capital'); } },
        { label: 'Allocate', detail: 'Paycheck and commission plans', type: 'Tab', run: function () { activate('allocate'); } },
        { label: 'Career', detail: 'Production, agenda and talent', type: 'Tab', run: function () { activate('career'); } },
        { label: 'Intelligence', detail: 'Open the Wire', type: 'Tab', run: function () { activate('intelligence'); } },
        { label: 'Watchlist', detail: 'Research and January plan', type: 'Tab', run: function () { activate('watchlist'); } },
        { label: 'Drive', detail: 'Goals and connections', type: 'Tab', run: function () { activate('drive'); } },
        { label: 'Taxes', detail: 'NJ to TX domicile planning', type: 'Tab', run: function () { activate('taxes'); } },
        { label: 'Dallas', detail: 'January relocation hub', type: 'Tab', run: function () { activate('dallas'); } },
        { label: 'Flights', detail: 'Flight and travel desk · coming soon', type: 'Tab', run: function () { activate('flights'); } },
        { label: 'Body', detail: 'Health and data imports', type: 'Tab', run: function () { activate('health'); } },
        { label: 'Talent pipeline', detail: 'Career · people by stage', type: 'Section', run: function () { activate('career'); setTalentView('pipeline'); document.getElementById('talent-section').scrollIntoView(); } },
        { label: 'Talent network', detail: 'Career · company and person graph', type: 'Section', run: function () { activate('career'); setTalentView('network'); document.getElementById('talent-section').scrollIntoView(); } },
        { label: 'Connections', detail: 'Drive · integration status', type: 'Section', run: function () { activate('drive'); document.getElementById('connections-section').scrollIntoView(); } },
        { label: 'Add asset', detail: 'Command · manual balance sheet', type: 'Action', run: function () { activate('command'); document.getElementById('manual-assets-panel').scrollIntoView(); document.getElementById('asset-name').focus(); } },
        { label: 'Add talent', detail: 'Career · new pipeline record', type: 'Action', run: function () { activate('career'); setTalentView('pipeline'); openTalentEditor(); } },
        { label: 'Import CSV', detail: 'Body · Whoop, Strong or MyFitnessPal', type: 'Action', run: function () { activate('health'); document.getElementById('body-csv-file').scrollIntoView(); document.getElementById('body-csv-file').focus(); } },
        { label: 'Go to watchlist', detail: 'Open research list', type: 'Action', run: function () { activate('watchlist'); } }
      ];
      function fuzzyScore(value, query) {
        var source = value.toLowerCase(); var needle = query.toLowerCase().trim(); if (!needle) return 1;
        var position = -1; var score = 0;
        for (var index = 0; index < needle.length; index += 1) { position = source.indexOf(needle[index], position + 1); if (position === -1) return 0; score += 10 - Math.min(position, 9); }
        if (source.indexOf(needle) !== -1) score += 30; return score;
      }
      function getVisibleCommands() {
        var query = commandSearch.value;
        return commandItems.map(function (item) { return { item: item, score: fuzzyScore(item.label + ' ' + item.detail + ' ' + item.type, query) }; }).filter(function (entry) { return entry.score > 0; }).sort(function (a, b) { return b.score - a.score; }).map(function (entry) { return entry.item; });
      }
      function renderCommands() {
        var visible = getVisibleCommands(); commandResults.replaceChildren(); commandSelection = Math.min(commandSelection, Math.max(0, visible.length - 1));
        if (!visible.length) { var empty = document.createElement('div'); empty.className = 'command-empty'; empty.textContent = 'No matching command.'; commandResults.appendChild(empty); return; }
        visible.forEach(function (item, index) {
          var button = document.createElement('button'); button.className = 'command-result' + (index === commandSelection ? ' active' : ''); button.type = 'button'; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', index === commandSelection ? 'true' : 'false');
          var copy = document.createElement('span'); var label = document.createElement('strong'); label.textContent = item.label; var detail = document.createElement('small'); detail.textContent = item.detail; copy.append(label, detail);
          var type = document.createElement('span'); type.textContent = item.type; button.append(copy, type);
          button.addEventListener('mouseenter', function () {
            commandSelection = index;
            commandResults.querySelectorAll('.command-result').forEach(function (result, resultIndex) { result.classList.toggle('active', resultIndex === commandSelection); result.setAttribute('aria-selected', resultIndex === commandSelection ? 'true' : 'false'); });
          });
          button.addEventListener('click', function () { commandPalette.close(); item.run(); }); commandResults.appendChild(button);
        });
      }
      function openCommandPalette() { commandSelection = 0; commandSearch.value = ''; renderCommands(); commandPalette.showModal(); window.setTimeout(function () { commandSearch.focus(); }, 0); }
      document.getElementById('command-trigger').addEventListener('click', openCommandPalette);
      document.addEventListener('keydown', function (event) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (commandPalette.open) commandPalette.close(); else openCommandPalette(); } });
      commandSearch.addEventListener('input', function () { commandSelection = 0; renderCommands(); });
      commandSearch.addEventListener('keydown', function (event) {
        var visible = getVisibleCommands(); if (!visible.length) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); commandSelection = (commandSelection + 1) % visible.length; renderCommands(); }
        if (event.key === 'ArrowUp') { event.preventDefault(); commandSelection = (commandSelection - 1 + visible.length) % visible.length; renderCommands(); }
        if (event.key === 'Enter') { event.preventDefault(); commandPalette.close(); visible[commandSelection].run(); }
      });
      commandPalette.addEventListener('click', function (event) { if (event.target === commandPalette) commandPalette.close(); });

      function dismissLoadScreen() {
        var loadScreen = document.getElementById('load-screen');
        if (!loadScreen) return;
        loadScreen.classList.add('is-ready');
        window.setTimeout(function () { if (loadScreen.isConnected) loadScreen.remove(); }, 700);
      }
      updateBalanceSheet();
      /* The vault can inject this markup after window.load has already fired, so
         dismiss from dashboard initialization rather than waiting on load. */
      window.setTimeout(dismissLoadScreen, 120);
    })();
  

(function(){
"use strict";
var KEY="cicerohq.v1";
function load(){try{var s=JSON.parse(localStorage.getItem(KEY));return s&&typeof s==="object"?s:{};}catch(e){return{};}}
function save(){try{var cur=load();for(var k in S)cur[k]=S[k];localStorage.setItem(KEY,JSON.stringify(cur));}catch(e){}}
var S=load();
S.targets=S.targets||{};S.tasks=S.tasks||{};S.assets=S.assets||[];
S.wlAdded=S.wlAdded||[];S.wlRemoved=S.wlRemoved||[];S.wlOrder=S.wlOrder||[];
S.buyPlan=S.buyPlan||[];S.intelSaved=S.intelSaved||[];
S.talent=S.talent||[];
S.debtSplits=S.debtSplits||{};
function fire(el,ev){try{el.dispatchEvent(new Event(ev,{bubbles:true}));}catch(e){}}
function setVal(el,v){if(!el)return;el.value=v;fire(el,"input");fire(el,"change");}

/* ---------- restore ---------- */
function restore(){
  // Apple Card balance
  if(S.apple!==undefined&&S.apple!==null){var a=document.getElementById("apple-balance");setVal(a,S.apple);}
  // plan check + debt splits (supports one or many plan inputs)
  if(S.planCheck!==undefined){var pc=document.getElementById("plan-check");setVal(pc,S.planCheck);}
  Object.keys(S.debtSplits).forEach(function(id){var el=document.getElementById(id);setVal(el,S.debtSplits[id]);});
  var dp=document.getElementById("debt-percent");
  if(dp&&S.debtPct!==undefined)setVal(dp,S.debtPct);
  // career premium inputs
  if(S.premSelf!==undefined)setVal(document.getElementById("prem-self"),S.premSelf);
  if(S.premOffice!==undefined)setVal(document.getElementById("prem-office"),S.premOffice);
  // watchlist target prices
  Object.keys(S.targets).forEach(function(sym){
    var el=document.querySelector('.target-input[data-symbol="'+sym+'"]');setVal(el,S.targets[sym]);
  });
  // task checkmarks
  Object.keys(S.tasks).forEach(function(id){
    var el=document.querySelector('input[type=checkbox][data-task="'+id+'"]');
    if(el){el.checked=!!S.tasks[id];fire(el,"change");}
  });
  // manual assets (replay through the page's own add flow; supports negatives)
  if(S.assets.length){
    var nameEl=document.getElementById("asset-name")||document.querySelector('[data-asset-name]');
    var valEl=document.getElementById("asset-value")||document.querySelector('[data-asset-value]');
    var addBtn=document.getElementById("asset-add")||document.querySelector('[data-asset-add]');
    var form=addBtn&&addBtn.closest?addBtn.closest("form"):null;
    S.assets.forEach(function(it){
      if(!nameEl||!valEl)return;
      // skip if already present
      var list=document.getElementById("manual-asset-list");
      if(list&&list.textContent.indexOf(it.name)>-1)return;
      nameEl.value=it.name;valEl.value=it.value;
      fire(nameEl,"input");fire(valEl,"input");
      if(addBtn){try{addBtn.click();}catch(e){}}
      else if(form){try{fire(form,"submit");}catch(e){}}
    });
  }
  // body CSV data (poll for the page's import hook)
  if(S.bodyCsv&&S.bodyCsv.length){
    var tries=0;
    var iv=setInterval(function(){
      tries++;
      if(window.__bodyCsvImport){clearInterval(iv);try{window.__bodyCsvImport(S.bodyCsv);}catch(e){}}
      else if(tries>40)clearInterval(iv);
    },250);
  }
}

/* ---------- hooks ---------- */
function hook(){
  function on(id,fn){var el=document.getElementById(id);if(el){el.addEventListener("input",fn);el.addEventListener("change",fn);}}
  on("apple-balance",function(e){var v=parseFloat(e.target.value);S.apple=isNaN(v)?null:v;save();});
  on("plan-check",function(e){S.planCheck=e.target.value;save();});
  on("debt-percent",function(e){S.debtPct=e.target.value;save();});
  on("prem-self",function(e){S.premSelf=e.target.value;save();});
  on("prem-office",function(e){S.premOffice=e.target.value;save();});
  // any extra debt-split inputs across plans
  document.querySelectorAll("input[data-debt-split]").forEach(function(el){
    var id=el.id||el.getAttribute("data-debt-split");
    el.addEventListener("input",function(){S.debtSplits[id]=el.value;save();});
    el.addEventListener("change",function(){S.debtSplits[id]=el.value;save();});
  });
  document.querySelectorAll(".target-input[data-symbol]").forEach(function(el){
    var f=function(){S.targets[el.getAttribute("data-symbol")]=el.value;save();};
    el.addEventListener("input",f);el.addEventListener("change",f);
  });
  document.querySelectorAll('input[type=checkbox][data-task]').forEach(function(el){
    el.addEventListener("change",function(){S.tasks[el.getAttribute("data-task")]=el.checked;save();});
  });
  // manual assets: snapshot the list whenever it changes (keeps negatives)
  var list=document.getElementById("manual-asset-list");
  if(list){
    var snap=function(){
      var out=[];
      list.querySelectorAll("[data-asset-item],li,.asset-row").forEach(function(row){
        var n=row.querySelector("[data-asset-name],.asset-name");
        var v=row.querySelector("[data-asset-value],.asset-value");
        var name=n?n.textContent.trim():(row.getAttribute("data-name")||"");
        var val=v?v.textContent.trim():(row.getAttribute("data-value")||"");
        val=parseFloat(String(val).replace(/[^0-9.\-]/g,""));
        if(name&&!isNaN(val))out.push({name:name,value:val});
      });
      // fallback: parse rows as "name ... value"
      if(!out.length){
        list.querySelectorAll("li").forEach(function(li){
          var t=li.textContent;
          var m=t.match(/(.+?)\s*\$?\s*(-?[\d,]+(?:\.\d{2})?)\s*$/);
          if(m)out.push({name:m[1].trim(),value:parseFloat(m[2].replace(/,/g,""))});
        });
      }
      S.assets=out;save();
    };
    new MutationObserver(snap).observe(list,{childList:true,subtree:true});
    snap();
  }
  // watchlist add/remove/order
  document.addEventListener("submit",function(e){
    if(e.target&&e.target.id==="watch-add-form"){setTimeout(saveWl,300);}
  },true);
  document.addEventListener("click",function(e){
    if(e.target&&e.target.closest&&e.target.closest(".remove-card"))setTimeout(saveWl,300);
  },true);
  document.addEventListener("dragend",function(){setTimeout(saveWl,300);},true);
  function saveWl(){
    var grid=document.getElementById("watchlist-grid");if(!grid)return;
    var order=[];
    grid.querySelectorAll("[data-key]").forEach(function(c){order.push(c.getAttribute("data-key"));});
    S.wlOrder=order;save();
  }
  // body CSV: persist parsed rows whenever the page updates its data block
  var csvBlock=document.getElementById("body-csv-data");
  if(csvBlock){
    new MutationObserver(function(){
      try{var rows=JSON.parse(csvBlock.textContent||"[]");S.bodyCsv=rows;save();}catch(e){}
    }).observe(csvBlock,{childList:true,characterData:true,subtree:true});
  }
  // buying plan + intel bookmarks: persist canonical JSON blocks; restore via import hooks.
  // The artifact keeps all state in these blocks' textContent and never touches
  // storage APIs itself; this shim (deploy-injected) is the only storage writer.
  [["buy-plan-data","buyPlan","__buyPlanImport"],["intel-saved-data","intelSaved","__intelSavedImport"]].forEach(function(spec){
    var id=spec[0], key=spec[1], hook=spec[2];
    var blk=document.getElementById(id);
    if(blk){
      new MutationObserver(function(){
        try{S[key]=JSON.parse(blk.textContent||"[]");save();}catch(e){}
      }).observe(blk,{childList:true,characterData:true,subtree:true});
    }
    if(S[key]&&S[key].length){
      var tries=0;
      var iv=setInterval(function(){
        tries++;
        if(window[hook]){clearInterval(iv);try{window[hook](S[key]);}catch(e){}}
        else if(tries>40)clearInterval(iv);
      },250);
    }
  });
}


  // talent pipeline: persist the canonical JSON block; restore into the
  // page's own records (shim is folded into initDashboard, same scope).
  // Bulletproof: wrap commitTalent so EVERY add/edit/delete forces a save,
  // in addition to the MutationObserver (belt and suspenders).
  function persistTalentNow(){
    try {
      var blk = document.getElementById("talent-data");
      if (blk) { S.talent = JSON.parse(blk.textContent || "[]"); save(); }
    } catch(e){}
  }
  var talentBlock = document.getElementById("talent-data");
  if (talentBlock) {
    new MutationObserver(function(){
      try { S.talent = JSON.parse(talentBlock.textContent || "[]"); save(); } catch(e){}
    }).observe(talentBlock, {childList:true, characterData:true, subtree:true});
    if (S.talent && S.talent.length) {
      try {
        talentRecords.length = 0;
        S.talent.forEach(function(r){ talentRecords.push(r); });
        commitTalent();
      } catch(e) {
        try { talentBlock.textContent = JSON.stringify(S.talent); } catch(e2){}
      }
    }
  }
  try {
    if (typeof commitTalent === "function") {
      var _origCommitTalent = commitTalent;
      commitTalent = function(){ _origCommitTalent(); persistTalentNow(); };
    }
  } catch(e){}
  try {
    window.addEventListener("beforeunload", persistTalentNow);
  } catch(e){}

try{restore();}catch(e){}
try{hook();}catch(e){}
})();


}
