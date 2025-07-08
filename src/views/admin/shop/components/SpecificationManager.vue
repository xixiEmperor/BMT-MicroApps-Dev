<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Delete, Plus, Setting } from '@element-plus/icons-vue'
import {
  getProductSpecifications,
  getProductSpecOptions,
  addProductSpecification,
  updateSpecification,
  deleteSpecification,
} from '@/api/shop'
import { createSpecificationTaskQueue } from '@/utils/TaskQueue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  productId: {
    type: Number,
    required: true
  },
  productSpecOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'success'])

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 规格选项表单
const specOptionsForm = ref([{ key: 'color', customKey: '', values: [] }])

// 生成的规格组合
const specCombinations = ref([])

// 现有规格列表
const existingSpecifications = ref([])

// 编辑模式规格
const editingSpec = ref(null)

// 任务队列相关
const taskQueue = ref(null)
const queueProgress = ref({
  total: 0,
  completed: 0,
  failed: 0,
  executing: 0,
  pending: 0,
  percentage: 0,
  isComplete: false,
  elapsedTime: 0
})

// 队列配置
const queueConfig = ref({
  maxConcurrent: 2,
  requestInterval: 200,
  maxRetries: 3,
  retryDelay: 1500,
  timeout: 15000
})

// 配置对话框
const configDialogVisible = ref(false)

// 失败任务详情对话框
const failedTasksDialogVisible = ref(false)
const failedTasks = ref([])

// 规格选项映射
const specKeyMap = {
  'color': '颜色',
  'size': '尺寸',
  'material': '材质',
  'style': '款式',
  'custom': '自定义'
}

// 初始化
onMounted(async () => {
  if (props.productId) {
    await Promise.all([
      loadProductSpecifications(),
      loadProductSpecOptions()
    ])
  }
})

// 组件销毁时清理任务队列
onUnmounted(() => {
  if (taskQueue.value) {
    taskQueue.value.destroy()
  }
})

// 加载商品规格列表
const loadProductSpecifications = async () => {
  loading.value = true
  try {
    const res = await getProductSpecifications(props.productId)
    if (res.data.code === 0) {
      existingSpecifications.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取商品规格失败')
    }
  } catch (error) {
    console.error('获取商品规格出错', error)
    ElMessage.error('获取商品规格出错')
  } finally {
    loading.value = false
  }
}

// 加载商品规格选项
const loadProductSpecOptions = async () => {
  try {
    const res = await getProductSpecOptions(props.productId)
    if (res.data.code === 0 && res.data.data) {
      const options = res.data.data
      console.log('规格选项:', options)

      // 重置规格选项表单
      specOptionsForm.value = []

      // 将已有规格选项加入表单
      options.forEach(item => {
        // 检查是否是预定义的规格类型
        const isPreDefinedKey = Object.keys(specKeyMap).includes(item.specKey)
        specOptionsForm.value.push({
          key: isPreDefinedKey ? item.specKey : 'custom',
          customKey: isPreDefinedKey ? '' : item.specKey,  // 如果不是预定义类型，保存为自定义类型
          values: item.specValues || []
        })
      })

      // 确保至少有一行
      if (specOptionsForm.value.length === 0) {
        specOptionsForm.value.push({ key: 'color', customKey: '', values: [] })
      }
    }
  } catch (error) {
    console.error('获取规格选项出错', error)
  }
}

// 格式化规格键名
const formatSpecKey = (key) => {
  return specKeyMap[key] || key
}

// 添加规格选项行
const addSpecOptionRow = () => {
  specOptionsForm.value.push({ key: '', customKey: '', values: [] })
}

// 移除规格选项行
const removeSpecOptionRow = (index) => {
  specOptionsForm.value.splice(index, 1)
}

// 生成规格组合
const generateSpecCombinations = () => {
  // 过滤有效的规格选项
  const validOptions = specOptionsForm.value.filter(opt => {
    return opt.key && opt.values && opt.values.length > 0 &&
           (opt.key !== 'custom' || (opt.key === 'custom' && opt.customKey))
  })

  if (validOptions.length === 0) {
    ElMessage.warning('请至少添加一个有效的规格选项')
    return
  }

  // 生成规格选项数据结构
  const optionsData = {}
  validOptions.forEach(opt => {
    const key = opt.key === 'custom' ? opt.customKey : opt.key
    optionsData[key] = opt.values
  })

  // 生成所有可能的组合
  specCombinations.value = generateCombinations(optionsData)
}

// 生成所有可能的规格组合(全排列)
const generateCombinations = (optionsData) => {
  const keys = Object.keys(optionsData)
  if (keys.length === 0) return []

  // 递归生成所有组合
  const combine = (index, current) => {
    if (index === keys.length) {
      return [{
        specs: { ...current },
        priceAdjustment: 0,
        stock: 100
      }]
    }

    const key = keys[index]
    const values = optionsData[key]
    const result = []

    values.forEach(value => {
      const newCurrent = { ...current }
      newCurrent[key] = value
      result.push(...combine(index + 1, newCurrent))
    })

    return result
  }

  return combine(0, {})
}

// 创建任务队列
const createQueue = () => {
  if (taskQueue.value) {
    taskQueue.value.destroy()
  }

  taskQueue.value = createSpecificationTaskQueue({
    ...queueConfig.value,
    onProgress: (progress) => {
      queueProgress.value = progress
    },
    onTaskComplete: (task, status) => {
      console.log(`任务 ${task.id} ${status === 'success' ? '成功' : '失败'}`)
    },
    onQueueComplete: (results) => {
      console.log('队列执行完成:', results)

      if (results.failed.length > 0) {
        failedTasks.value = results.failed
        ElMessage.warning(`保存完成！成功: ${results.completed.length}，失败: ${results.failed.length}`)
      } else {
        ElMessage.success(`所有 ${results.completed.length} 个规格保存成功！`)
      }

      // 重新加载规格列表
      loadProductSpecifications()
    },
    onError: (task, error) => {
      console.error('任务执行错误:', task, error)
    }
  })
}

// 保存所有规格（使用任务队列）
const saveAllSpecifications = async () => {
  if (specCombinations.value.length === 0) {
    ElMessage.warning('请先生成规格组合')
    return
  }

  submitting.value = true

  try {
    // 创建任务队列
    createQueue()

    // 将规格组合转换为任务
    const tasks = specCombinations.value.map(combo => ({
      fn: async (data, signal) => {
        // 任务执行函数
        return await addProductSpecification(props.productId, {
          specifications: data.specs,
          priceAdjustment: data.priceAdjustment,
          stock: data.stock
        }, {
          signal: signal
        })
      },
      data: combo,
      options: {
        priority: 1 // 可以根据需要设置优先级
      }
    }))

    // 批量添加任务
    taskQueue.value.addTasks(tasks)

    // 开始执行队列
    await taskQueue.value.start()

    // 清空规格组合
    specCombinations.value = []

  } catch (error) {
    console.error('保存规格失败:', error)
    ElMessage.error('保存规格失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// 暂停队列
const pauseQueue = () => {
  if (taskQueue.value) {
    taskQueue.value.pause()
    ElMessage.info('队列已暂停')
  }
}

// 恢复队列
const resumeQueue = () => {
  if (taskQueue.value) {
    taskQueue.value.resume()
    ElMessage.info('队列已恢复')
  }
}

// 停止队列
const stopQueue = () => {
  if (taskQueue.value) {
    taskQueue.value.stop()
    ElMessage.info('队列已停止')
    submitting.value = false
  }
}

// 重试失败任务
const retryFailedTasks = async () => {
  if (taskQueue.value && failedTasks.value.length > 0) {
    taskQueue.value.retryFailedTasks()
    failedTasks.value = []
    failedTasksDialogVisible.value = false
    ElMessage.info('失败任务已重新加入队列')
  }
}

// 打开配置对话框
const openConfigDialog = () => {
  configDialogVisible.value = true
}

// 保存配置
const saveConfig = () => {
  if (taskQueue.value) {
    taskQueue.value.updateConfig(queueConfig.value)
  }
  configDialogVisible.value = false
  ElMessage.success('配置已更新')
}

// 查看失败任务
const viewFailedTasks = () => {
  if (taskQueue.value) {
    const results = taskQueue.value.getResults()
    failedTasks.value = results.failed
    failedTasksDialogVisible.value = true
  }
}

// 格式化时间
const formatTime = (ms) => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

// 编辑规格
const editSpecification = (spec) => {
  editingSpec.value = { ...spec }
}

// 保存编辑的规格
const saveEditingSpec = async () => {
  if (!editingSpec.value) return

  try {
    const res = await updateSpecification(editingSpec.value.id, {
      priceAdjustment: editingSpec.value.priceAdjustment,
      stock: editingSpec.value.stock
    })

    if (res.data.code === 0) {
      ElMessage.success('更新规格成功')
      await loadProductSpecifications()
      editingSpec.value = null
    } else {
      ElMessage.error(res.data.msg || '更新规格失败')
    }
  } catch (error) {
    console.error('更新规格出错', error)
    ElMessage.error('更新规格失败')
  }
}

// 取消编辑
const cancelEditing = () => {
  editingSpec.value = null
}

// 删除规格
const handleDeleteSpec = (specId) => {
  ElMessageBox.confirm('确认删除该规格？此操作不可恢复', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteSpecification(specId)
        if (res.data.code === 0) {
          ElMessage.success('删除规格成功')
          await loadProductSpecifications()
        } else {
          ElMessage.error(res.data.msg || '删除规格失败')
        }
      } catch (error) {
        console.error('删除规格出错', error)
        ElMessage.error('删除规格失败')
      }
    })
    .catch(() => {})
}

// 关闭对话框
const handleClose = () => {
  // 如果有正在执行的队列，询问是否停止
  if (taskQueue.value && queueProgress.value.executing > 0) {
    ElMessageBox.confirm('当前有任务正在执行，确认关闭吗？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        stopQueue()
        emit('close')
      })
      .catch(() => {})
  } else {
    emit('close')
  }
}

// 规格操作完成
const handleSuccess = () => {
  emit('success')
  handleClose()
}
</script>

<template>
  <el-dialog
    title="商品规格管理"
    :modelValue="visible"
    width="900px"
    @close="handleClose"
  >
    <div class="specification-manager" v-loading="loading">
      <!-- 规格选项管理 -->
      <div class="spec-options-section">
        <h4>步骤1: 添加规格类型和选项</h4>
        <div v-for="(options, index) in specOptionsForm" :key="index" class="spec-option-row">
          <el-select v-model="options.key" placeholder="规格类型" style="width: 120px;">
            <el-option label="颜色" value="color"></el-option>
            <el-option label="尺寸" value="size"></el-option>
            <el-option label="材质" value="material"></el-option>
            <el-option label="款式" value="style"></el-option>
            <el-option label="自定义" value="custom"></el-option>
          </el-select>

          <!-- 自定义规格类型输入框 -->
          <el-input
            v-if="options.key === 'custom'"
            v-model="options.customKey"
            placeholder="请输入规格类型名称"
            style="width: 150px; margin: 0 10px;">
          </el-input>

          <el-select
            v-model="options.values"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="规格选项值"
            style="width: 450px; margin: 0 10px;">
            <el-option
              v-for="item in (productSpecOptions.get && options.key ? productSpecOptions.get(options.key) : [])"
              :key="item"
              :label="item"
              :value="item">
            </el-option>
          </el-select>

          <el-button
            v-if="index === specOptionsForm.length - 1"
            type="primary"
            circle
            @click="addSpecOptionRow">
            <el-icon><Plus /></el-icon>
          </el-button>

          <el-button
            v-if="specOptionsForm.length > 1"
            type="danger"
            circle
            @click="removeSpecOptionRow(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 规格组合生成 -->
      <div class="spec-combinations-section">
        <div class="section-header">
          <h4>步骤2: 生成规格组合</h4>
          <el-button
            type="info"
            size="small"
            @click="openConfigDialog"
            :icon="Setting">
            队列配置
          </el-button>
        </div>

        <el-button type="primary" @click="generateSpecCombinations">生成规格组合</el-button>

        <div v-if="specCombinations.length > 0" class="combinations-table">
          <el-table :data="specCombinations" border style="width: 100%; margin-top: 20px;">
            <el-table-column label="规格组合">
              <template #default="scope">
                <div v-for="(value, key) in scope.row.specs" :key="key">
                  {{ formatSpecKey(key) }}: {{ value }}
                </div>
              </template>
            </el-table-column>

            <el-table-column label="价格调整" width="150">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.priceAdjustment"
                  :precision="2"
                  :step="10"
                  :min="-1000"
                  :max="1000">
                </el-input-number>
              </template>
            </el-table-column>

            <el-table-column label="库存" width="150">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.stock"
                  :min="0"
                  :max="9999">
                </el-input-number>
              </template>
            </el-table-column>
          </el-table>

          <!-- 任务队列控制面板 -->
          <div class="queue-control-panel">
            <div class="queue-actions">
              <el-button
                type="primary"
                :loading="submitting"
                @click="saveAllSpecifications"
                :disabled="queueProgress.executing > 0">
                开始保存所有规格
              </el-button>

              <el-button
                v-if="queueProgress.executing > 0"
                type="warning"
                @click="pauseQueue">
                暂停
              </el-button>

              <el-button
                v-if="queueProgress.executing > 0"
                type="info"
                @click="resumeQueue">
                恢复
              </el-button>

              <el-button
                v-if="queueProgress.executing > 0"
                type="danger"
                @click="stopQueue">
                停止
              </el-button>

              <el-button
                v-if="queueProgress.failed > 0"
                type="warning"
                @click="viewFailedTasks">
                查看失败任务 ({{ queueProgress.failed }})
              </el-button>
            </div>

            <!-- 进度显示 -->
            <div v-if="queueProgress.total > 0" class="progress-info">
              <div class="progress-stats">
                <el-tag type="info">总计: {{ queueProgress.total }}</el-tag>
                <el-tag type="success">已完成: {{ queueProgress.completed }}</el-tag>
                <el-tag type="warning">执行中: {{ queueProgress.executing }}</el-tag>
                <el-tag type="info">待处理: {{ queueProgress.pending }}</el-tag>
                <el-tag v-if="queueProgress.failed > 0" type="danger">失败: {{ queueProgress.failed }}</el-tag>
                <el-tag type="info">耗时: {{ formatTime(queueProgress.elapsedTime) }}</el-tag>
              </div>

              <el-progress
                :percentage="queueProgress.percentage"
                :status="queueProgress.failed > 0 ? 'exception' :
                         queueProgress.isComplete ? 'success' : 'primary'"
                :show-text="true"
                class="progress-bar">
              </el-progress>
            </div>
          </div>
        </div>
      </div>

      <!-- 现有规格管理 -->
      <div class="existing-specs-section" v-if="existingSpecifications.length > 0">
        <h4>现有规格组合</h4>
        <el-table :data="existingSpecifications" border style="width: 100%">
          <el-table-column label="规格组合">
            <template #default="scope">
              <div v-for="(value, key) in scope.row.specifications" :key="key">
                {{ formatSpecKey(key) }}: {{ value }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="价格调整" width="120">
            <template #default="scope">
              <span v-if="editingSpec && editingSpec.id === scope.row.id">
                <el-input-number
                  v-model="editingSpec.priceAdjustment"
                  :precision="2"
                  :step="10"
                  :min="-1000"
                  :max="1000"
                  size="small"
                  style="width: 100px;">
                </el-input-number>
              </span>
              <span v-else>{{ scope.row.priceAdjustment }}</span>
            </template>
          </el-table-column>

          <el-table-column label="库存" width="100">
            <template #default="scope">
              <span v-if="editingSpec && editingSpec.id === scope.row.id">
                <el-input-number
                  v-model="editingSpec.stock"
                  :min="0"
                  :max="9999"
                  size="small"
                  style="width: 90px;">
                </el-input-number>
              </span>
              <span v-else>{{ scope.row.stock }}</span>
            </template>
          </el-table-column>

          <el-table-column label="销量" width="100">
            <template #default="scope">
              {{ scope.row.sales || 0 }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160">
            <template #default="scope">
              <div v-if="editingSpec && editingSpec.id === scope.row.id">
                <el-button type="success" size="small" @click="saveEditingSpec">
                  保存
                </el-button>
                <el-button size="small" @click="cancelEditing">
                  取消
                </el-button>
              </div>
              <div v-else>
                <el-button type="primary" size="small" @click="editSpecification(scope.row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="handleDeleteSpec(scope.row.id)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleSuccess">完成</el-button>
      </div>
    </template>

    <!-- 队列配置对话框 -->
    <el-dialog
      title="任务队列配置"
      v-model="configDialogVisible"
      width="500px">
      <el-form :model="queueConfig" label-width="120px">
        <el-form-item label="最大并发数">
          <el-input-number
            v-model="queueConfig.maxConcurrent"
            :min="1"
            :max="10"
            controls-position="right">
          </el-input-number>
          <div class="form-tip">建议设置为1-3，避免数据库死锁</div>
        </el-form-item>

        <el-form-item label="请求间隔(ms)">
          <el-input-number
            v-model="queueConfig.requestInterval"
            :min="50"
            :max="2000"
            :step="50"
            controls-position="right">
          </el-input-number>
          <div class="form-tip">请求之间的间隔时间，减少服务器压力</div>
        </el-form-item>

        <el-form-item label="最大重试次数">
          <el-input-number
            v-model="queueConfig.maxRetries"
            :min="0"
            :max="10"
            controls-position="right">
          </el-input-number>
        </el-form-item>

        <el-form-item label="重试延迟(ms)">
          <el-input-number
            v-model="queueConfig.retryDelay"
            :min="500"
            :max="10000"
            :step="500"
            controls-position="right">
          </el-input-number>
        </el-form-item>

        <el-form-item label="请求超时(ms)">
          <el-input-number
            v-model="queueConfig.timeout"
            :min="5000"
            :max="60000"
            :step="5000"
            controls-position="right">
          </el-input-number>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </template>
    </el-dialog>

    <!-- 失败任务对话框 -->
    <el-dialog
      title="失败任务详情"
      v-model="failedTasksDialogVisible"
      width="700px">
      <el-table :data="failedTasks" border max-height="400">
        <el-table-column label="任务ID" prop="id" width="80"></el-table-column>
        <el-table-column label="规格组合" width="200">
          <template #default="scope">
            <div v-for="(value, key) in scope.row.data.specs" :key="key" class="spec-item">
              {{ formatSpecKey(key) }}: {{ value }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="重试次数" width="100">
          <template #default="scope">
            {{ scope.row.options.retries }}/{{ scope.row.options.maxRetries }}
          </template>
        </el-table-column>
        <el-table-column label="错误信息">
          <template #default="scope">
            <el-text type="danger" size="small">{{ scope.row.error?.message || '未知错误' }}</el-text>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="failedTasksDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="retryFailedTasks">重试失败任务</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style lang="less" scoped>
.specification-manager {
  padding: 10px;

  .spec-options-section, .spec-combinations-section, .existing-specs-section {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h4 {
      margin: 0;
    }
  }

  .spec-option-row {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .queue-control-panel {
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e9ecef;
  }

  .queue-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .progress-info {
    .progress-stats {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .progress-bar {
      margin-top: 10px;
    }
  }

  h4 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 16px;
    color: #303133;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }

  .spec-item {
    font-size: 12px;
    line-height: 1.4;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
