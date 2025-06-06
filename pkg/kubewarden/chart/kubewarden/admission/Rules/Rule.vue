<script>
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';

import { _CREATE } from '@shell/config/query-params';

import LabeledSelect from '@shell/components/form/LabeledSelect';

import { KUBEWARDEN } from '@kubewarden/types';
import { schemasForGroup } from '@kubewarden/modules/core';

export default {
  name: 'Rule',

  props: {
    // Full list of available apiGroups
    apiGroups: {
      type:     Array,
      default: () => []
    },

    disabled: {
      type:     Boolean,
      required: true
    },

    mode: {
      type:    String,
      default: _CREATE
    },

    // List of apiGroups which point to namespaced resources
    namespacedGroups: {
      type:    Array,
      default: () => []
    },

    // List of schemas with namespaced resources
    namespacedSchemas: {
      type:    Array,
      default: () => []
    },

    // List of all schemas
    schemas: {
      type:    Array,
      default: () => []
    },

    value: {
      type:    Object,
      default: () => {}
    }
  },

  inject: ['chartType'],

  components: { LabeledSelect },

  fetch() {
    if (this.isCreate && isEmpty(this.value?.apiGroups)) {
      if (!Array.isArray(this.value.apiGroups)) {
        this.value.apiGroups = [];
      }

      this.value.apiGroups.push('*');
    }
  },

  data() {
    const apiGroupValues = this.value?.apiGroups || [];

    const scopeOptions = [
      '*',
      'Cluster',
      'Namespaced'
    ];
    const operationOptions = [
      '*',
      'CREATE',
      'UPDATE',
      'DELETE',
      'CONNECT'
    ];

    return {
      scopeOptions,
      operationOptions,
      apiGroupValues,

      noResourceOptions: false
    };
  },

  computed: {

    filteredGroups() {
      return this.chartType === KUBEWARDEN.ADMISSION_POLICY ? this.namespacedGroups : this.apiGroups;
    },

    filteredSchemas() {
      return this.chartType === KUBEWARDEN.ADMISSION_POLICY ? this.namespacedSchemas : this.schemas;
    },

    apiGroupOptions() {
      const out = ['*'];

      if (!isEmpty(this.filteredGroups)) {
        this.filteredGroups.forEach((g) => {
          out.push(g.id);
        });

        const coreIndex = out.indexOf('core');

        if (coreIndex) {
          // Removing core from apiGroups as this leads to zero resources
          out.splice(coreIndex, 1);
        }

        return out.sort();
      }

      out.push(this.filteredGroups);

      return out.sort();
    },

    apiVersionOptions() {
      let out = [];

      if (!isEmpty(this.value?.apiGroups) && !this.isGroupAll) {
        out = this.apiVersions(this.value.apiGroups, true);
      } else if (!isEmpty(this.value?.resources)) {
        out = this.apiVersions(this.value.resources, false);
      }

      return out;
    },

    isCreate() {
      return this.mode === _CREATE;
    },

    isGlobalRule() {
      return this.chartType === KUBEWARDEN.CLUSTER_ADMISSION_POLICY;
    },

    isGroupAll() {
      const groups = this.value?.apiGroups;

      if (groups.length === 0 || groups.includes('*')) {
        return true;
      }

      return false;
    },

    resourceOptions() {
      /*
        If no apiGroup or '*' is selected we want to show all of the available resources
        Comparable to `kubectl api-resources -o wide`
      */
      let schemas = this.filteredSchemas;

      if (this.value?.apiGroups?.length > 0 && !this.isGroupAll) {
        schemas = this.value.apiGroups.map((group) => schemasForGroup(this.$store, group))[0];
      }

      const filtered = schemas?.filter((schema) => schema?.attributes?.resource);
      const resourceSet = [...new Set(filtered?.map((f) => f.attributes.resource))];

      return resourceSet.sort();
    }
  },

  methods: {
    // Determine which apiVersions to show, either from the apiGroup or targeted resource
    apiVersions(types, isGroup) {
      let versions = [];

      types?.forEach((type) => {
        const toFind = isGroup ? this.apiGroups : this.filteredSchemas;

        toFind.find((f) => {
          if (isGroup && f.id === type) {
            versions = [...versions, flatMap(f.versions, (v) => v.groupVersion)];
          } else if (f.attributes?.resource === type) {
            versions = [...versions, f.attributes.version];
          }
        });
      });

      return [...new Set(flatMap(versions))];
    },

    setGroup(event) {
      if (this.value?.apiGroups?.includes(event)) {
        return;
      }

      if (!this.value?.apiGroups?.includes(event)) {
        this.value.apiGroups.pop();
      }

      this.value?.apiGroups?.push(event);
    }
  }
};
</script>

<template>
  <div
    v-if="value"
    class="rules-row mt-40 mb-20"
    :class="{ 'global-rules': isGlobalRule, 'namespaced-rules': !isGlobalRule }"
  >
    <div v-if="isGlobalRule">
      <LabeledSelect
        v-model:value="value.scope"
        data-testid="kw-policy-rules-rule-scope-select"
        :disabled="disabled"
        :label="t('kubewarden.policyConfig.scope.label')"
        :tooltip="t('kubewarden.policyConfig.scope.tooltip')"
        :mode="mode"
        :multiple="false"
        :options="scopeOptions || []"
      />
    </div>

    <div>
      <LabeledSelect
        v-model:value="apiGroupValues"
        data-testid="kw-policy-rules-rule-apigroup-select"
        :disabled="disabled"
        :label="t('kubewarden.policyConfig.apiGroups.label')"
        :tooltip="t('kubewarden.policyConfig.apiGroups.tooltip')"
        :mode="mode"
        :multiple="false"
        :options="apiGroupOptions || []"
        :required="true"
        @selecting="setGroup"
      />
    </div>

    <div>
      <LabeledSelect
        v-model:value="value.resources"
        data-testid="kw-policy-rules-rule-resources-select"
        :disabled="disabled"
        :label="t('kubewarden.policyConfig.resources.label')"
        :mode="mode"
        :multiple="true"
        :options="resourceOptions || []"
        :searchable="true"
        :required="true"
        :tooltip="t('kubewarden.policyConfig.resources.tooltip')"
      />
    </div>

    <div>
      <LabeledSelect
        v-model:value="value.apiVersions"
        data-testid="kw-policy-rules-rule-apiversions-select"
        :disabled="disabled"
        :clearable="true"
        :searchable="false"
        :mode="mode"
        :multiple="true"
        :options="apiVersionOptions || []"
        :required="true"
        placement="bottom"
        :label="t('kubewarden.policyConfig.apiVersions.label')"
        :tooltip="t('kubewarden.policyConfig.apiVersions.tooltip')"
      />
    </div>

    <div>
      <LabeledSelect
        v-model:value="value.operations"
        data-testid="kw-policy-rules-rule-operations-select"
        :disabled="disabled"
        :label="t('kubewarden.policyConfig.operations.label')"
        :mode="mode"
        :multiple="true"
        :required="true"
        :options="operationOptions || []"
        :tooltip="t('kubewarden.policyConfig.operations.tooltip')"
      />
    </div>

    <slot name="removeRule" />
  </div>
</template>

<style lang="scss" scoped>
.rules-row {
  display: grid;
  grid-template-columns: .5fr 1fr 1fr 1fr 1fr .5fr;
  grid-column-gap: $column-gutter;
  align-items: center;
}

.global-rules {
  grid-template-columns: .5fr 1fr 1fr 1fr 1fr .5fr;
}

.namespaced-rules {
  grid-template-columns: 1fr 1fr 1fr 1fr .5fr;
}
</style>
