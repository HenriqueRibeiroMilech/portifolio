<script setup>
defineProps({ name: String })
const paths = {
  'arrow-up-right': 'M5 19 19 5M5 5h14v14',
  'arrow-down-right': 'm5 5 14 14M5 19h14V5',
  'arrow-down': 'M12 4v16m-6-6 6 6 6-6',
  'arrow-up': 'M12 20V4m-6 6 6-6 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 7h16M4 17h16',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',
  database:
    'M20 5c0 2-4 3-8 3S4 7 4 5s4-3 8-3 8 1 8 3Zm0 0v14c0 2-4 3-8 3s-8-1-8-3V5m0 7c0 2 4 3 8 3s8-1 8-3',
  window: 'M3 3h18v18H3ZM3 8h18M7 5.5h.1m3 0h.1',
  asterisk: 'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  lock: 'M5 10h14v11H5Zm3 0V6a4 4 0 0 1 8 0v4m-4 4v3',
  send: 'm3 3 18 9-18 9 4-9Zm4 9h14',
  back: 'M9 4 3 10l6 6M3 10h11a6 6 0 0 1 0 12',
  minus: 'M5 12h14',
}
</script>

<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.spark" />
  </svg>
</template>
