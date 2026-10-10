<script setup>
import profile from '../content/profile.json'
</script>

<template>
  <main>
    <p>Desenvolvimento de software, dados & IA</p>
    <h1>{{ profile.name }}</h1>
    <p>{{ profile.summary }}</p>
  </main>
</template>
