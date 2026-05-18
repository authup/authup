import DefaultTheme from 'vitepress/theme';
import Hero from './components/Hero.vue';
import FeatureGrid from './components/FeatureGrid.vue';
import DeploymentShowcase from './components/DeploymentShowcase.vue';
import CodeTabs from './components/CodeTabs.vue';
import IntegrationSpotlight from './components/IntegrationSpotlight.vue';
import './style.css';

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('Hero', Hero);
        app.component('FeatureGrid', FeatureGrid);
        app.component('DeploymentShowcase', DeploymentShowcase);
        app.component('CodeTabs', CodeTabs);
        app.component('IntegrationSpotlight', IntegrationSpotlight);
    },
};
