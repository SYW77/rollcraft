// 멀티 플레이: 레이스 중 순위판(왼쪽) · 완주 결과 화면. 담당: 최수정
import './ui.css';

/**
 * 레이스 중 순위판.
 * @param {HTMLElement} container
 * @returns {{ update(rows: { name: string, me: boolean, done?: boolean }[]): void, destroy(): void }}
 *   rows는 앞선 순서대로
 */
export function createRankBoard(container) {
  const el = document.createElement('ol');
  el.className = 'ui-rank';
  container.appendChild(el);
  let last = '';
  return {
    update(rows) {
      const key = JSON.stringify(rows);
      if (key === last) return;
      last = key;
      el.innerHTML = rows
        .map((r, i) => `<li class="${r.me ? 'ui-me' : ''}"><b>${i + 1}</b><span></span></li>`)
        .join('');
      el.querySelectorAll('span').forEach((s, i) => {
        s.textContent = rows[i].name + (rows[i].done ? ' ✓' : '');
      });
    },
    destroy() {
      el.remove();
    },
  };
}

/**
 * 완주 결과 화면 (다른 사람이 들어올 때마다 update로 갱신).
 * @param {HTMLElement} container
 * @param {{ myId: number, onLobby: () => void, onLeave: () => void }} opts
 * @returns {{ update(list: { id: number, name: string, time: number }[], total: number): void, destroy(): void }}
 */
export function showRaceResults(container, { myId, onLobby, onLeave }) {
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-overlay-clear';
  el.innerHTML = `
    <div class="ui-modal-card">
      <h2 class="ui-modal-title">완주!</h2>
      <p class="ui-modal-sub"></p>
      <div class="ui-modal-detail">
        <div class="ui-tip-card"><ol class="ui-results-list"></ol></div>
      </div>
      <div class="ui-modal-actions">
        <button type="button" class="ui-btn ui-btn-primary" data-act="lobby"><span>대기실로</span></button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="leave"><span>나가기</span></button>
      </div>
    </div>
  `;
  el.querySelector('[data-act=lobby]').onclick = () => onLobby();
  el.querySelector('[data-act=leave]').onclick = () => onLeave();
  container.appendChild(el);
  const sub = el.querySelector('.ui-modal-sub');
  const ol = el.querySelector('.ui-results-list');
  return {
    update(list, total) {
      const mine = list.findIndex((r) => r.id === myId);
      sub.textContent =
        (mine >= 0 ? `${mine + 1}등!` : '') +
        (list.length < total
          ? `  다른 사람을 기다리는 중 (${list.length}/${total})`
          : '  모두 들어왔어요');
      ol.innerHTML = list
        .map(
          (r, i) =>
            `<li class="${r.id === myId ? 'ui-me' : ''}"><b>${i + 1}등</b><span></span><em>${r.time.toFixed(2)}초</em></li>`,
        )
        .join('');
      ol.querySelectorAll('span').forEach((s, i) => (s.textContent = list[i].name));
    },
    destroy() {
      el.remove();
    },
  };
}
