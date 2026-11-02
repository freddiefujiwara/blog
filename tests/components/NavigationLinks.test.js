import { mount} from '@vue/test-utils';
import { describe, expect, it} from 'vitest';
import NavigationLinks from '../../src/components/NavigationLinks.vue';

const routerLinkStub = { template: '<a :href="$attrs.to"><slot /></a>' };

describe('NavigationLinks', () => {
it('renders nothing when no links are provided', () => {
const wrapper = mount(NavigationLinks, {
global: {
stubs: { RouterLink: true}
}
});
expect(wrapper.find('nav').exists()).toBe(false);
});

it('renders one-line text links with arrows and titles', () => {
const wrapper = mount(NavigationLinks, {
props: {
prevLink: '/prev',
prevTitle: 'Previous Article Title',
nextLink: '/next',
nextTitle: 'Next'
},
global: {
stubs: { RouterLink: routerLinkStub}
}
});
expect(wrapper.find('nav').exists()).toBe(true);
const links = wrapper.findAll('a');
expect(links).toHaveLength(2);
expect(links[0].classes()).toContain('nav-link');
expect(links[0].classes()).toContain('nav-prev');
expect(links[0].find('.nav-title').text()).toBe('Previous Article Title');
expect(links[0].attributes('href')).toBe('/prev');
expect(links[0].attributes('aria-label')).toBe('前の記事: Previous Article Title');
expect(links[1].classes()).toContain('nav-next');
expect(links[1].find('.nav-title').text()).toBe('Next');
expect(links[1].attributes('href')).toBe('/next');
expect(links[1].attributes('aria-label')).toBe('次の記事: Next');
});

it('drops the leading date from titles so the meaningful part is visible', () => {
const wrapper = mount(NavigationLinks, {
props: {
prevLink: '/prev',
prevTitle: '2026-11-01 サーバー代ゼロ。お金をかけないホームページとブログの続け方',
nextLink: '/next',
nextTitle: '2026-11-02 AI「Muse」を1週間使い倒したら'
},
global: {
stubs: { RouterLink: routerLinkStub}
}
});
const links = wrapper.findAll('a');
expect(links[0].find('.nav-title').text()).toBe(
'サーバー代ゼロ。お金をかけないホームページとブログの続け方'
);
expect(links[1].find('.nav-title').text()).toBe(
'AI「Muse」を1週間使い倒したら'
);
// The full title (with date) stays available via aria-label.
expect(links[0].attributes('aria-label')).toContain('2026-11-01');
});

it('renders fallback labels when titles are missing', () => {
const wrapper = mount(NavigationLinks, {
props: {
prevLink: '/prev',
nextLink: '/next',
prevTitle: '',
nextTitle: ''
},
global: {
stubs: { RouterLink: routerLinkStub}
}
});
const links = wrapper.findAll('a');
expect(links[0].find('.nav-title').text()).toBe('前の記事');
expect(links[0].attributes('aria-label')).toBe('前の記事');
expect(links[1].find('.nav-title').text()).toBe('次の記事');
expect(links[1].attributes('aria-label')).toBe('次の記事');
});

it('applies top class when top prop is true', () => {
const wrapper = mount(NavigationLinks, {
props: {
prevLink: '/prev',
top: true
},
global: {
stubs: { RouterLink: true}
}
});
expect(wrapper.find('nav').classes()).toContain('navigation-top');
});

it('renders only one link when only one is provided', () => {
const wrapper = mount(NavigationLinks, {
props: {
nextLink: '/next',
nextTitle: 'Next'
},
global: {
stubs: { RouterLink: routerLinkStub}
}
});
const links = wrapper.findAll('a');
expect(links).toHaveLength(1);
expect(links[0].classes()).toContain('nav-next');
expect(links[0].find('.nav-title').text()).toBe('Next');
});
});
