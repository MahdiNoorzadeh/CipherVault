
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import '@mdi/font/css/materialdesignicons.min.css';
import 'vuetify/styles';

const themes = {
  dark: {
    dark: true,
    colors: {
      background: '#111318',
      surface: '#191C23',
      'surface-bright': '#292D38',
      'surface-light': '#222631',
      'surface-variant': '#292D38',
      'on-background': '#F1F2F7',
      'on-surface': '#F1F2F7',
      'on-surface-variant': '#C1C5D0',

      primary: '#B5A0FF',
      'on-primary': '#211642',
      'primary-darken-1': '#9D83F5',

      secondary: '#A7ADBD',
      'on-secondary': '#20232B',

      accent: '#C4B5FD',
      'on-accent': '#211642',

      error: '#FF7D8A',
      'on-error': '#351018',

      success: '#67D6A3',
      'on-success': '#10291F',

      warning: '#F2C477',
      'on-warning': '#30220C',

      info: '#83B8FF',
      'on-info': '#14253C',

      outline: '#414653',
      'outline-variant': '#30343F',
      'border-color': '#414653',
      'border-opacity': 1
    },
    variables: {
      'border-color': '#414653',
      'border-opacity': 1,
      'high-emphasis-opacity': 1,
      'medium-emphasis-opacity': 0.76,
      'disabled-opacity': 0.42,
      'idle-opacity': 0.08,
      'hover-opacity': 0.08,
      'focus-opacity': 0.12,
      'selected-opacity': 0.12,
      'activated-opacity': 0.12,
      'pressed-opacity': 0.16,
      'dragged-opacity': 0.12,
      'kbd-background-color': '#292D38',
      'kbd-color': '#F1F2F7'
    }
  },

  light: {
    dark: false,
    colors: {
      background: '#F6F5FA',
      surface: '#FFFFFF',
      'surface-bright': '#FFFFFF',
      'surface-light': '#F0EDF8',
      'surface-variant': '#EAE6F2',
      'on-background': '#24202F',
      'on-surface': '#24202F',
      'on-surface-variant': '#514B61',

      primary: '#6D4AFF',
      'on-primary': '#FFFFFF',
      'primary-darken-1': '#5838E8',

      secondary: '#655D75',
      'on-secondary': '#FFFFFF',

      accent: '#795CF5',
      'on-accent': '#FFFFFF',

      error: '#B4233A',
      'on-error': '#FFFFFF',

      success: '#16794A',
      'on-success': '#FFFFFF',

      warning: '#946000',
      'on-warning': '#FFFFFF',

      info: '#245FC7',
      'on-info': '#FFFFFF',

      outline: '#D2CCDF',
      'outline-variant': '#E5E0ED',
      'border-color': '#D2CCDF',
      'border-opacity': 1
    },
    variables: {
      'border-color': '#D2CCDF',
      'border-opacity': 1,
      'high-emphasis-opacity': 1,
      'medium-emphasis-opacity': 0.78,
      'disabled-opacity': 0.42,
      'idle-opacity': 0.08,
      'hover-opacity': 0.06,
      'focus-opacity': 0.12,
      'selected-opacity': 0.1,
      'activated-opacity': 0.1,
      'pressed-opacity': 0.12,
      'dragged-opacity': 0.1,
      'kbd-background-color': '#EAE6F2',
      'kbd-color': '#24202F'
    }
  }
};

export default createVuetify({
  components,
  directives,

  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },

  theme: {
    defaultTheme: 'dark',
    themes
  },

  defaults: {
    VCard: {
      rounded: 'lg',
      elevation: 0
    },

    VBtn: {
      rounded: 'md',
      style: 'text-transform: none; letter-spacing: normal;'
    },

    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },

    VTextarea: {
      variant: 'outlined',
      color: 'primary'
    },

    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },

    VCheckbox: {
      color: 'primary'
    },

    VSwitch: {
      color: 'primary'
    },

    VDialog: {
      scrollable: true
    },

    VTable: {
      density: 'comfortable',
      hover: true
    },

    VChip: {
      rounded: 'md'
    }
  }
});
