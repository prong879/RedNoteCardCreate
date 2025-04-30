<template>
    <div class="topic-card-skeleton p-4 bg-white border border-gray-200 rounded-lg shadow-md animate-pulse flex flex-col">
        <!-- 模拟序号和卡片数量的背景块 -->
        <div class="absolute top-0 right-1 w-16 h-16 bg-gray-200 rounded-bl-lg opacity-50"></div>
        <div class="absolute bottom-4 right-4 w-12 h-5 bg-gray-200 rounded-full"></div>
        
        <!-- 模拟内容区 -->
        <div class="flex-grow z-10 relative pr-16">
            <!-- 模拟标题 -->
            <div class="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
            <div class="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
            <!-- 模拟描述 -->
            <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
        </div>
        
        <!-- 模拟按钮区 -->
        <div class="z-10 relative flex items-center space-x-2 mt-auto">
            <div class="h-7 bg-gray-300 rounded w-20"></div>
            <div class="h-7 bg-gray-200 rounded w-24"></div>
        </div>
    </div>
</template>

<script setup>
// 骨架屏组件通常不需要逻辑
</script>

<style scoped>
/* 可以添加额外的样式，但 Tailwind 的 animate-pulse 通常足够 */
</style> 