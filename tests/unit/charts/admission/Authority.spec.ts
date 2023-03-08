import { ExtendedVue, Vue } from 'vue/types/vue';
import { DefaultProps } from 'vue/types/options';
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from '@jest/globals';

import Authority from '@kubewarden/chart/kubewarden/policy-server/Registry/Authority.vue';
import { LabeledInput } from '@components/Form/LabeledInput';

const authorityObj = {
  'registry-pre.example.com': [
    '-----BEGIN CERTIFICATE-----\nca-pre1-1 PEM cert\n-----END CERTIFICATE-----\n',
    '-----BEGIN CERTIFICATE-----\nca-pre1-2 PEM cert\n-----END CERTIFICATE-----'
  ]
};

const row = () => {
  let out = {};

  for ( const [key, value] of Object.entries(authorityObj) ) {
    out = {
      registryName: key,
      certs:        value
    };
  }

  return out;
};

describe('component: Authority', () => {
  it('renders authorityObj key as registryName', () => {
    const wrapper = shallowMount(Authority as unknown as ExtendedVue<Vue, {}, {}, {}, DefaultProps>, {
      propsData: { value: row() },
      stubs:     { FileSelector: { template: '<span />' } }
    });

    const registryName = wrapper.findAllComponents(LabeledInput).at(0);

    expect(registryName.props().value).toStrictEqual(wrapper.props().value?.registryName as String);
  });

  it('renders all certs from authorityObj', () => {
    const wrapper = shallowMount(Authority as unknown as ExtendedVue<Vue, {}, {}, {}, DefaultProps>, {
      propsData: { value: row() },
      stubs:     { FileSelector: { template: '<span />' } }
    });

    const authorityCerts = wrapper.findAllComponents(LabeledInput);

    expect(authorityCerts.at(1).props().value).toStrictEqual(wrapper.props().value?.certs[0] as String);
    expect(authorityCerts.at(2).props().value).toStrictEqual(wrapper.props().value?.certs[1] as String);
  });
});
