<script>
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { SCHEMA } from '@shell/config/types';

import Loading from '@shell/components/Loading';

import { namespacedGroups, namespacedSchemas } from '@kubewarden/modules/core';
import { KUBEWARDEN, KUBEWARDEN_ANNOTATIONS, KUBEWARDEN_APPS } from '@kubewarden/types';
import Rule from './Rule';

export default {
  name: 'Rules',

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },
    value: {
      type:     Object,
      required: true
    }
  },

  components: {
    Loading,
    Rule
  },

  inject: ['chartType'],

  async fetch() {
    if (this.$store.getters['cluster/canList']('apigroup')) {
      await this.$store.dispatch('cluster/findAll', { type: 'apigroup' });
    }

    this.rules = [];

    if (!!this.value?.policy) {
      this.rules = this.value.policy?.spec?.rules;
    }
  },

  data() {
    return { rules: null };
  },

  computed: {
    apiGroups() {
      return this.$store.getters['cluster/all']('apigroup');
    },

    disabledRules() {
      const annotations = this.value.policy?.metadata?.annotations;

      return !!annotations?.[KUBEWARDEN_ANNOTATIONS.CHART_KEY] || annotations?.['meta.helm.sh/release-name'] === KUBEWARDEN_APPS.RANCHER_DEFAULTS;
    },

    isView() {
      return this.mode === _VIEW;
    },

    namespacedGroups() {
      if (this.chartType === KUBEWARDEN.ADMISSION_POLICY) {
        return namespacedGroups(this.$store, this.apiGroups);
      }

      return null;
    },

    namespacedSchemas() {
      if (this.chartType === KUBEWARDEN.ADMISSION_POLICY) {
        return namespacedSchemas(this.schemas);
      }

      return null;
    },

    schemas() {
      return this.$store.getters['cluster/all'](SCHEMA);
    }
  },

  methods: {
    addRule() {
      this.rules.push({});
    },

    removeRule(index) {
      this.rules.splice(index, 1);
    }
  }
};
</script>

<template>
  <Loading v-if="$fetchState.pending" mode="relative" />
  <div v-else>
    <div v-for="(rule, index) in rules" :key="'filtered-rule-' + index">
      <Rule
        ref="lastRule"
        v-model:value="rules[index]"
        :data-testid="`kw-policy-rules-rule-${ index }`"
        :disabled="disabledRules"
        :mode="mode"
        :api-groups="apiGroups"
        :namespaced-groups="namespacedGroups"
        :namespaced-schemas="namespacedSchemas"
        :schemas="schemas"
      >
        <template v-if="!isView && !disabledRules" #removeRule>
          <button :data-testid="`kw-policy-rules-rule-remove-${ index }`" type="button" class="btn role-link p-0" @click="removeRule(index)">
            {{ t('kubewarden.policyConfig.rules.remove') }}
          </button>
        </template>
      </Rule>
    </div>

    <button v-if="!isView && !disabledRules" data-testid="kw-policy-rules-rule-add" type="button" class="btn role-tertiary add" @click="addRule">
      {{ t('kubewarden.policyConfig.rules.add') }}
    </button>
  </div>
</template>
