<script setup>
import {
    VPTeamPage,
    VPTeamPageTitle,
    VPTeamMembers
} from 'vitepress/theme';

const members = [
    {
        avatar: 'https://www.github.com/tada5hi.png',
        name: 'tada5hi',
        title: 'Creator',
        links: [
            { icon: 'github', link: 'https://github.com/tada5hi' },
            { icon: 'twitter', link: 'https://twitter.com/tada5hi' },
            { icon: 'linkedin', link: 'https://www.linkedin.com/in/peter-placzek-047a74210/' },
        ]
    },
    {
        avatar: 'https://www.github.com/migraf.png',
        name: 'migraf',
        title: 'Developer',
        links: [
            { icon: 'github', link: 'https://github.com/migraf' },
            { icon: 'linkedin', link: 'https://www.linkedin.com/in/michael-m-graf/' },
        ]
    }
]
</script>

<template>
    <div>
        <VPTeamPage>
            <VPTeamPageTitle>
                <template #title>
                    Our Team
                </template>
            </VPTeamPageTitle>
            <VPTeamMembers
                :members="members"
            />
        </VPTeamPage>
    </div>
</template>

