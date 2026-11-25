// The longest june editor: sign-in, navigation, screens, and the Publish bar.
import { GitHub, GitHubError, type Pending } from './github';
import { getToken, setToken, login } from './auth';
import { el, icon, button, busy, toast, confirmBox, describePath, plural, row, rowList } from './ui';
import { setPreviewSource } from './images';
import { renderFields, saveBar } from './forms';
import { SECTIONS, type Section } from './sections';
import { notesList, noteEditor } from './notes';
import { MessagesApi, messagesView } from './messages';
import { galleryView, albumView } from './albums';
import { projectsView, projectView } from './projects';

export type View = {
  title: string;
  jp: string;
  intro?: string;
  body: HTMLElement;
  actions?: HTMLElement[];
  footer?: HTMLElement;
  back?: { href: string; label: string };
  isDirty?: () => boolean;
  /** Saves anything waiting; resolves true when everything is saved. */
  flush?: () => Promise<boolean>;
  destroy?: () => void;
};

const root = document.getElementById('ed')!;
const AUTH_URL = root.dataset.auth || '';
const API_URL = root.dataset.api || '';
const SITE = root.dataset.site || '/';

let gh: GitHub;
let api: MessagesApi | null = null;
let current: View | null = null;
let lastHash = location.hash;

const NAV: { hash: string; label: string }[] = [
  { hash: '#/', label: 'Overview' },
  { hash: '#/notes', label: 'Stories' },
  { hash: '#/projects', label: 'Projects' },
  { hash: '#/gallery', label: 'Gallery' },
  { hash: '#/site', label: 'Text & About' },
  { hash: '#/now', label: 'Currently' },
  { hash: '#/shop', label: 'Shop' },
  { hash: '#/resume', label: 'Resume' },
  { hash: '#/messages', label: 'Messages' },
];

// ---------- sign-in ----------

function signInScreen(message = '') {
  const status = el('p', { cls: 'ed-note-msg', role: 'status', hidden: !message }, message);
  const btn = button('Sign in with GitHub', () =>
    busy(btn, 'Waiting for GitHub…', async () => {
      try {
        const token = await login(AUTH_URL);
        setToken(token);
        await start();
      } catch (e) {
        status.hidden = false;
        status.textContent = (e as Error).message;
      }
    }),
  'ed-btn solid big');
  root.replaceChildren(
    el(
      'div',
      { cls: 'ed-signin' },
      el('p', { cls: 'lab soft' }, 'longest june'),
      el('h1', { cls: 'disp' }, 'Editor'),
      el('p', { cls: 'lab soft', lang: 'ja' }, '編集'),
      el('p', { cls: 'statement' }, 'Sign in with the GitHub account that can edit the site.'),
      AUTH_URL ? btn : el('p', { cls: 'soft' }, 'Sign-in isn’t set up yet: add authUrl to src/data/services.json.'),
      status,
      el('p', { cls: 'ed-hint' }, el('a', { href: SITE }, 'Back to the site'), ' · ', el('a', { href: `${SITE}admin/classic/` }, 'Classic editor')),
    ),
  );
}

function signOut() {
  setToken('');
  current?.destroy?.();
  current = null;
  signInScreen('You’re signed out.');
}

// ---------- shell ----------

const main = el('main', { cls: 'ed-main', id: 'ed-main', tabindex: '-1' });
const navList = el('ul', { cls: 'ed-nav-list' });
const publishBar = el('div', { cls: 'ed-publish', hidden: true });
const userLabel = el('span', { cls: 'lab soft ed-user' });

function shell() {
  const menuBtn = el('button', { type: 'button', cls: 'ed-icon ed-menu-btn', 'aria-label': 'Sections', 'aria-expanded': 'false' }, icon('menu'));
  const nav = el('nav', { cls: 'ed-nav', 'aria-label': 'Editor sections' }, navList);
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  navList.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  root.replaceChildren(
    el(
      'header',
      { cls: 'ed-top' },
      menuBtn,
      el('a', { href: '#/', cls: 'ed-brand' }, el('span', { cls: 'disp' }, 'Longest June'), el('span', { cls: 'lab soft' }, 'Editor')),
      el(
        'div',
        { cls: 'ed-top-right' },
        userLabel,
        el('a', { href: SITE, cls: 'lab ed-top-site', target: '_blank', rel: 'noopener' }, 'View site ', icon('external', 14)),
        button('Sign out', signOut, 'lab ed-plain'),
      ),
    ),
    el('div', { cls: 'ed-body' }, nav, main),
    publishBar,
  );
}

function drawNav() {
  const seg = (location.hash || '#/').split('/')[1] || '';
  const here = '#/' + (seg === 'albums' ? 'gallery' : seg); // albums live under Gallery
  navList.replaceChildren(
    ...NAV.map((n) => el('li', {}, el('a', { href: n.hash, 'aria-current': here === n.hash ? 'page' : null }, n.label))),
    // On phones the top bar has no room for "View site", so it lives in this menu instead.
    el('li', { cls: 'ed-nav-site' }, el('a', { href: SITE, target: '_blank', rel: 'noopener' }, 'View site ', icon('external', 14))),
  );
}

// ---------- publish bar ----------

let pending: Pending = { count: 0, files: [] };

async function refreshPending() {
  try {
    pending = await gh.pending();
  } catch {
    return;
  }
  publishBar.hidden = pending.count === 0;
  document.body.classList.toggle('has-publish', pending.count > 0);
  const pub = button('Publish', () => publish(pub), 'ed-btn solid');
  const discard = button('Discard', discardDrafts, 'ed-btn quiet');
  publishBar.replaceChildren(
    el('span', { cls: 'ed-publish-text' }, el('strong', {}, plural(pending.count, 'unpublished change')), el('span', { cls: 'soft' }, ' saved in drafts')),
    el('span', { cls: 'ed-actions' }, el('a', { href: '#/', cls: 'ed-link' }, 'Review'), discard, pub),
  );
}

const onOverview = () => (location.hash || '#/') === '#/';

async function publish(btn: HTMLButtonElement) {
  // Save anything still waiting first, so it's included.
  if (current?.isDirty?.() && !(await (current.flush?.() ?? Promise.resolve(false))) && !(await confirmBox('Some changes aren’t saved', 'Some changes on this screen couldn’t be saved, so they won’t be published. Publish the rest?', 'Publish anyway'))) return;
  const list = pending.files.map((f) => `• ${describePath(f.path)}`).join('\n');
  if (!(await confirmBox('Publish to the live site?', `${list}\n\nThe site updates in a minute or two.`, 'Publish'))) return;
  await busy(btn, 'Publishing…', async () => {
    const names = pending.files.map((f) => describePath(f.path));
    await gh.publish(`Publish: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`);
    toast('Published. The live site updates in a minute or two.');
    await refreshPending();
    if (onOverview()) route(true);
  });
}

async function discardDrafts() {
  if (!(await confirmBox('Discard all unpublished changes?', 'Everything saved in drafts since the last publish will be thrown away. This can’t be undone.', 'Discard', true))) return;
  try {
    await gh.discard();
    toast('Drafts discarded.');
    await refreshPending();
    route(true); // the screen may show discarded edits
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ---------- screens ----------

async function overview(): Promise<View> {
  const unread = api ? await api.unreadCount().catch(() => 0) : 0;
  const tiles = [
    row(null, ['Write a story'], '#/notes/new'),
    row(null, ['Add photos to the gallery'], '#/gallery'),
    row(null, ['Edit projects'], '#/projects'),
    row(null, [unread ? `Read ${plural(unread, 'new message')}` : 'Messages'], '#/messages'),
  ];
  return {
    title: 'Editor',
    jp: '編集',
    intro: 'Save as often as you like: saves go to drafts. Publish when you’re ready for them to go live.',
    body: el(
      'div',
      {},
      el('div', { cls: 'ed-split' }, el('span', { cls: 'lab' }, 'Start'), rowList(tiles)),
      el(
        'div',
        { cls: 'ed-split' },
        el('span', { cls: 'lab' }, 'Drafts'),
        pending.count
          ? el('div', {}, rowList(pending.files.map((f) => row(f.status, [describePath(f.path)]))), el('p', { cls: 'soft' }, 'Use Publish at the bottom of the screen to make these live.'))
          : el('p', { cls: 'soft' }, 'Nothing waiting. Everything saved is live.'),
      ),
    ),
  };
}

async function sectionView(s: Section): Promise<View> {
  const text = await gh.readText(s.file);
  if (text === null) throw new Error(`${s.file} is missing.`);
  const data = JSON.parse(text);
  const bar = saveBar('All changes saved', async (photos) => {
    await gh.commit([{ path: s.file, text: JSON.stringify(data, null, 2) + '\n' }, ...photos], `Update ${s.title.toLowerCase()}`);
    refreshPending();
  });
  return {
    title: s.title,
    jp: s.jp,
    intro: s.intro,
    body: renderFields(s.fields, data, bar.ctx),
    footer: bar.footer,
    isDirty: bar.isDirty,
    flush: bar.flush,
  };
}

// ---------- router ----------

/** Moves to another screen after a save, without the "unsaved changes" question. */
function goTo(hash: string) {
  lastHash = hash;
  history.replaceState(null, '', hash);
  route(true);
}

async function route(force = false) {
  const hash = location.hash || '#/';
  // Leaving a screen saves anything still waiting; only if that fails is there a question.
  if (!force && hash !== lastHash && current?.isDirty?.() && !(await (current.flush?.() ?? Promise.resolve(false)))) {
    if (!(await confirmBox('Leave without saving?', 'Some changes on this screen couldn’t be saved. Leave anyway?', 'Leave', true))) {
      history.replaceState(null, '', lastHash);
      return;
    }
  }
  lastHash = hash;
  drawNav();
  current?.destroy?.();
  current = null;
  main.replaceChildren(el('p', { cls: 'soft ed-loading' }, 'Loading…'));

  const [, a, b] = hash.split('/');
  try {
    let view: View;
    if (!a) view = await overview();
    else if (a === 'notes' && !b) view = await notesList(gh);
    else if (a === 'notes') view = await noteEditor(gh, b === 'new' ? null : decodeURIComponent(b), goTo, refreshPending);
    else if (a === 'gallery') view = await galleryView(gh, refreshPending);
    else if (a === 'projects' && !b) view = await projectsView(gh, refreshPending);
    else if (a === 'projects') view = await projectView(gh, b === 'new' ? null : decodeURIComponent(b), goTo, refreshPending);
    else if (a === 'albums' && b) view = await albumView(gh, b === 'new' ? null : decodeURIComponent(b), goTo, refreshPending);
    else if (a === 'messages') view = await messagesView(api, () => route(true));
    else {
      const s = SECTIONS.find((x) => x.id === a);
      if (!s) throw new Error('There’s nothing here.');
      view = await sectionView(s);
    }
    current = view;
    main.replaceChildren(
      el(
        'div',
        { cls: 'ed-head' },
        view.back ? el('a', { href: view.back.href, cls: 'lab ed-back' }, icon('back', 14), ` ${view.back.label}`) : null,
        el('div', { cls: 'ed-head-row' }, el('h1', { cls: 'disp' }, view.title), view.actions ? el('div', { cls: 'ed-actions' }, ...view.actions) : null),
        el('div', { cls: 'ed-head-sub' }, el('span', { cls: 'lab soft', lang: 'ja' }, view.jp), view.intro ? el('span', { cls: 'soft' }, view.intro) : null),
      ),
      view.body,
      view.footer || '',
    );
    main.focus({ preventScroll: true });
    scrollTo(0, 0);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 401) return signOut();
    main.replaceChildren(el('div', { cls: 'ed-head' }, el('h1', { cls: 'disp' }, 'Hmm')), el('p', { cls: 'statement' }, (e as Error).message), el('p', {}, el('a', { href: '#/' }, 'Back to the overview')));
  }
}

// ---------- start ----------

async function start() {
  const token = getToken();
  if (!token) return signInScreen();
  gh = new GitHub(token);
  root.replaceChildren(el('p', { cls: 'soft ed-loading' }, 'Opening the editor…'));
  try {
    const [user, ok] = await Promise.all([gh.user(), gh.canEdit()]);
    if (!ok) {
      setToken('');
      return signInScreen(`@${user.login} can’t edit this site. Ask the owner to add you as a collaborator on GitHub.`);
    }
    await gh.syncDrafts();
    userLabel.textContent = user.name || user.login;
  } catch (e) {
    setToken('');
    return signInScreen((e as Error).message);
  }
  api = API_URL ? new MessagesApi(API_URL, token) : null;
  setPreviewSource(gh);
  shell();
  await refreshPending();
  route(true);
}

addEventListener('hashchange', () => route());
addEventListener('beforeunload', (e) => {
  if (current?.isDirty?.()) e.preventDefault();
});

start();
