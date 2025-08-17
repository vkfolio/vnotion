<template>
  <div
    :class="[
      'database-cell px-3 py-2 h-10 flex items-center cursor-pointer',
      {
        'bg-blue-50 dark:bg-blue-900/20': isEditing,
        'font-medium': isPrimary
      }
    ]"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- Display Mode -->
    <div v-if="!isEditing" class="w-full">
      <component
        :is="getCellDisplayComponent()"
        :value="value"
        :column="column"
        :is-primary="isPrimary"
      />
    </div>

    <!-- Edit Mode -->
    <div v-else class="w-full">
      <component
        :is="getCellEditComponent()"
        :value="value"
        :column="column"
        @value-changed="handleValueChange"
        @edit-end="handleEditEnd"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'

// Cell display components
import TextCellDisplay from './cells/TextCellDisplay.vue'
import NumberCellDisplay from './cells/NumberCellDisplay.vue'
import SelectCellDisplay from './cells/SelectCellDisplay.vue'
import DateCellDisplay from './cells/DateCellDisplay.vue'
import CheckboxCellDisplay from './cells/CheckboxCellDisplay.vue'
import UrlCellDisplay from './cells/UrlCellDisplay.vue'
import EmailCellDisplay from './cells/EmailCellDisplay.vue'
import PhoneCellDisplay from './cells/PhoneCellDisplay.vue'
import FileCellDisplay from './cells/FileCellDisplay.vue'
import RelationCellDisplay from './cells/RelationCellDisplay.vue'
import FormulaCellDisplay from './cells/FormulaCellDisplay.vue'

// Cell edit components
import TextCellEdit from './cells/TextCellEdit.vue'
import NumberCellEdit from './cells/NumberCellEdit.vue'
import SelectCellEdit from './cells/SelectCellEdit.vue'
import DateCellEdit from './cells/DateCellEdit.vue'
import CheckboxCellEdit from './cells/CheckboxCellEdit.vue'
import UrlCellEdit from './cells/UrlCellEdit.vue'
import EmailCellEdit from './cells/EmailCellEdit.vue'
import PhoneCellEdit from './cells/PhoneCellEdit.vue'
import FileCellEdit from './cells/FileCellEdit.vue'
import RelationCellEdit from './cells/RelationCellEdit.vue'

export default {
  name: 'DatabaseCell',

  components: {
    // Display components
    TextCellDisplay,
    NumberCellDisplay,
    SelectCellDisplay,
    DateCellDisplay,
    CheckboxCellDisplay,
    UrlCellDisplay,
    EmailCellDisplay,
    PhoneCellDisplay,
    FileCellDisplay,
    RelationCellDisplay,
    FormulaCellDisplay,

    // Edit components
    TextCellEdit,
    NumberCellEdit,
    SelectCellEdit,
    DateCellEdit,
    CheckboxCellEdit,
    UrlCellEdit,
    EmailCellEdit,
    PhoneCellEdit,
    FileCellEdit,
    RelationCellEdit
  },

  props: {
    column: {
      type: Object,
      required: true
    },
    value: {
      type: [String, Number, Boolean, Array, Object],
      default: null
    },
    isEditing: {
      type: Boolean,
      default: false
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'value-changed',
    'edit-start',
    'edit-end',
    'click'
  ],

  data() {
    return {
      isFocused: false
    }
  },

  methods: {
    getCellDisplayComponent() {
      const componentMap = {
        [COLUMN_TYPES.TEXT]: 'TextCellDisplay',
        [COLUMN_TYPES.NUMBER]: 'NumberCellDisplay',
        [COLUMN_TYPES.SELECT]: 'SelectCellDisplay',
        [COLUMN_TYPES.MULTI_SELECT]: 'SelectCellDisplay',
        [COLUMN_TYPES.DATE]: 'DateCellDisplay',
        [COLUMN_TYPES.CHECKBOX]: 'CheckboxCellDisplay',
        [COLUMN_TYPES.URL]: 'UrlCellDisplay',
        [COLUMN_TYPES.EMAIL]: 'EmailCellDisplay',
        [COLUMN_TYPES.PHONE]: 'PhoneCellDisplay',
        [COLUMN_TYPES.FILE]: 'FileCellDisplay',
        [COLUMN_TYPES.RELATION]: 'RelationCellDisplay',
        [COLUMN_TYPES.FORMULA]: 'FormulaCellDisplay',
        [COLUMN_TYPES.CREATED_TIME]: 'DateCellDisplay',
        [COLUMN_TYPES.LAST_EDITED_TIME]: 'DateCellDisplay',
        [COLUMN_TYPES.CREATED_BY]: 'TextCellDisplay',
        [COLUMN_TYPES.LAST_EDITED_BY]: 'TextCellDisplay'
      }

      return componentMap[this.column.type] || 'TextCellDisplay'
    },

    getCellEditComponent() {
      // Read-only column types
      if ([
        COLUMN_TYPES.FORMULA,
        COLUMN_TYPES.CREATED_TIME,
        COLUMN_TYPES.LAST_EDITED_TIME,
        COLUMN_TYPES.CREATED_BY,
        COLUMN_TYPES.LAST_EDITED_BY
      ].includes(this.column.type)) {
        return this.getCellDisplayComponent()
      }

      const componentMap = {
        [COLUMN_TYPES.TEXT]: 'TextCellEdit',
        [COLUMN_TYPES.NUMBER]: 'NumberCellEdit',
        [COLUMN_TYPES.SELECT]: 'SelectCellEdit',
        [COLUMN_TYPES.MULTI_SELECT]: 'SelectCellEdit',
        [COLUMN_TYPES.DATE]: 'DateCellEdit',
        [COLUMN_TYPES.CHECKBOX]: 'CheckboxCellEdit',
        [COLUMN_TYPES.URL]: 'UrlCellEdit',
        [COLUMN_TYPES.EMAIL]: 'EmailCellEdit',
        [COLUMN_TYPES.PHONE]: 'PhoneCellEdit',
        [COLUMN_TYPES.FILE]: 'FileCellEdit',
        [COLUMN_TYPES.RELATION]: 'RelationCellEdit'
      }

      return componentMap[this.column.type] || 'TextCellEdit'
    },

    handleClick() {
      this.$emit('click')
    },

    handleDoubleClick() {
      if (!this.isReadOnly()) {
        this.$emit('edit-start')
      }
    },

    handleValueChange(newValue) {
      this.$emit('value-changed', newValue)
    },

    handleEditEnd() {
      this.$emit('edit-end')
    },

    handleFocus() {
      this.isFocused = true
    },

    handleBlur() {
      this.isFocused = false
    },

    isReadOnly() {
      return [
        COLUMN_TYPES.FORMULA,
        COLUMN_TYPES.CREATED_TIME,
        COLUMN_TYPES.LAST_EDITED_TIME,
        COLUMN_TYPES.CREATED_BY,
        COLUMN_TYPES.LAST_EDITED_BY
      ].includes(this.column.type)
    }
  }
}
</script>

<style scoped>
.database-cell {
  border-right: 1px solid theme('colors.gray.200');
}

.dark .database-cell {
  border-right-color: theme('colors.gray.700');
}

.database-cell:hover {
  background-color: theme('colors.gray.50');
}

.dark .database-cell:hover {
  background-color: rgba(55, 65, 81, 0.5);
}
</style>