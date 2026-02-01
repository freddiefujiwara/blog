import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StatusMessage from '../../src/components/StatusMessage.vue';

describe('StatusMessage', () => {
  it('renders nothing when no message is provided', () => {
    const wrapper = mount(StatusMessage);
    expect(wrapper.find('p').exists()).toBe(false);
  });

  it('renders message when provided', () => {
    const wrapper = mount(StatusMessage, {
      props: {
        message: 'Hello World'
      }
    });
    expect(wrapper.find('p').text()).toBe('Hello World');
    expect(wrapper.find('p').classes()).toContain('status');
  });
});
