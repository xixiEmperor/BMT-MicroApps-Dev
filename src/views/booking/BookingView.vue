<script setup>
import { ref, computed, onMounted } from 'vue'
import NoticeList from './components/NoticeList.vue'
import VenueStatusMatrix from './components/VenueStatusMatrix.vue'
import CreateOrderForm from './components/CreateOrderForm.vue'
import { Calendar } from '@element-plus/icons-vue'
import { getVenueList, getVenueAvailability} from '@/api/venue'

/**
 * 通用日期格式化函数 - 避免时区问题
 * @description 将Date对象转换为YYYY-MM-DD格式的字符串，用于API调用
 * @param {Date} date - 需要格式化的日期对象
 * @returns {string} 格式化后的日期字符串，如"2024-01-15"
 * @example formatDateToString(new Date()) => "2024-01-15"
 */
const formatDateToString = (date) => {
  const year = date.getFullYear()                              // 获取完整年份
  const month = String(date.getMonth() + 1).padStart(2, '0')   // 获取月份(0-11)，需要+1，并补零
  const day = String(date.getDate()).padStart(2, '0')         // 获取日期，并补零
  return `${year}-${month}-${day}`                            // 返回ISO格式日期字符串
}

/**
 * 检查是否为工作日（周一到周五）
 * @description 判断指定日期是否为工作日，用于确定场地开放时间
 * @param {Date} date - 需要检查的日期对象
 * @returns {boolean} true表示工作日，false表示非工作日
 * @business 工作日场地开放时间：18:00-21:00（仅晚上开放）
 */
const isWeekday = (date) => {
  const day = date.getDay()  // 获取星期几：0=周日，1=周一...6=周六
  return day >= 1 && day <= 5  // 周一(1)到周五(5)为工作日
}

/**
 * 检查是否为周末（周六、周日）
 * @description 判断指定日期是否为周末，用于确定场地开放时间
 * @param {Date} date - 需要检查的日期对象
 * @returns {boolean} true表示周末，false表示非周末
 * @business 周末场地开放时间：8:00-21:00（全天开放）
 */
const isWeekend = (date) => {
  const day = date.getDay()  // 获取星期几
  return day === 0 || day === 6  // 周日(0)和周六(6)为周末
}

/**
 * 检查指定日期和时间是否在可预约时间范围内 - 核心业务逻辑函数
 * @description 根据复杂的业务规则检查时间是否可预约，包含今天/明天的不同限制
 * @param {Date} date - 预约日期
 * @param {string} startTime - 预约开始时间，格式："HH:mm"
 * @returns {boolean} true表示可预约，false表示不可预约
 * @business 业务规则：
 *   - 今天场地：只要当前时间 < 预约开始时间就可预约
 *   - 明天场地：只有当前时间 >= 18:00才能预约明天的场地
 *   - 其他日期：不允许预约
 */
const isBookingTimeValid = (date, startTime) => {
  // 获取当前实时时间（用于时间限制判断）
  const now = new Date()

  // 创建今天的日期对象（时间设为00:00:00用于日期比较）
  const today = new Date()
  today.setHours(0, 0, 0, 0)  // 重置时分秒毫秒为0，确保只比较日期部分

  // 创建明天的日期对象
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)  // 在今天基础上加1天

  // 标准化选择的日期（去除时分秒，只保留日期部分）
  const selectedDate = new Date(date)
  selectedDate.setHours(0, 0, 0, 0)

  // 【今天场地的预约规则】
  if (selectedDate.getTime() === today.getTime()) {
    // 解析预约开始时间字符串为小时和分钟
    const [startHour, startMinute] = startTime.split(':').map(Number)

    // 创建今天的预约开始时间对象
    const startDateTime = new Date()
    startDateTime.setHours(startHour, startMinute, 0, 0)

    // 核心判断：当前时间必须小于预约开始时间才能预约
    // 例如：现在17:00，预约18:00场地 → 可以预约
    //      现在19:00，预约18:00场地 → 不能预约（已过时）
    return now.getTime() < startDateTime.getTime()
  }

  // 【明天场地的预约规则】
  if (selectedDate.getTime() === tomorrow.getTime()) {
    // 获取当前小时数
    const currentHour = now.getHours()

    // 核心判断：当前时间必须 >= 18:00才能预约明天的场地
    // 例如：现在17:30 → 不能预约明天场地
    //      现在18:30 → 可以预约明天场地
    return currentHour >= 18
  }

  // 【其他日期】：不允许预约（只能预约今天和明天）
  return false
}

/**
 * 获取时间限制状态文本 - 用于UI提示
 * @description 根据日期和当前时间返回相应的时间限制提示文本
 * @param {Date} date - 检查的日期
 * @returns {string|null} 限制提示文本，无限制时返回null
 * @usage 主要用于UI显示，告知用户为什么不能预约
 */
const getTimeRestrictionText = (date) => {
  // 获取当前时间和标准化的今天/明天日期
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const selectedDate = new Date(date)
  selectedDate.setHours(0, 0, 0, 0)

  // 特殊情况：选择明天且当前时间还没到18:00
  if (selectedDate.getTime() === tomorrow.getTime() && now.getHours() < 18) {
    return '不在可预约时间（明天场地需今天18:00后预约）'
  }

  // 其他情况返回null（无限制提示）
  return null
}

/**
 * 获取指定日期的开放时间段 - 基础时间段定义
 * @description 根据日期类型（工作日/周末）返回对应的开放时间段
 * @param {Date} date - 查询的日期
 * @returns {string[]} 时间段数组，格式：["开始时间-结束时间"]
 * @business 业务规则：
 *   - 工作日：['18:00-21:00'] （仅晚上开放）
 *   - 周末：['8:00-21:00'] （全天开放）
 *   - 其他：[] （不开放，如节假日等）
 */
const getAvailableTimeSlots = (date) => {
  // 工作日：白天用于校内上课，只有晚上18:00-21:00开放
  if (isWeekday(date)) {
    return ['18:00-21:00']
  }

  // 周末：全天开放预约，时间为8:00-21:00
  if (isWeekend(date)) {
    return ['8:00-21:00']
  }

  // 其他情况（如节假日）：不开放
  return []
}

/**
 * 根据开放时间段生成可选时间选项 - 核心算法函数
 * @description 复杂的时间选项生成算法，包含时间限制过滤、步长控制、边界处理
 * @param {Date} date - 目标日期
 * @returns {object} 包含开始时间和结束时间选项的对象
 * @returns {string[]} returns.startOptions - 可选的开始时间数组
 * @returns {string[]} returns.endOptions - 可选的结束时间数组
 * @algorithm 算法步骤：
 *   1. 获取基础时间段
 *   2. 解析时间段字符串
 *   3. 计算边界条件
 *   4. 循环生成时间选项（1小时步长）
 *   5. 实时过滤（调用isBookingTimeValid）
 *   6. 去重排序
 */
const getTimeOptionsForDate = (date) => {
  // 步骤1：获取该日期的基础开放时间段
  const timeSlots = getAvailableTimeSlots(date)
  if (timeSlots.length === 0) return { startOptions: [], endOptions: [] }

  // 初始化结果数组
  const startOptions = []
  const endOptions = []

  // 步骤2：解析时间段字符串（目前只处理第一个时间段）
  const slot = timeSlots[0]  // 例如："18:00-21:00"
  const [startTime, endTime] = slot.split('-')  // ["18:00", "21:00"]
  const [startHour, startMinute] = startTime.split(':').map(Number)  // [18, 0]
  const [endHour, endMinute] = endTime.split(':').map(Number)        // [21, 0]

  // 步骤3：计算起始时间选项的边界
  // 当前处理的时间（从开放时间开始）
  let currentHour = startHour    // 18
  let currentMinute = startMinute // 0

  // 计算最晚的起始时间（结束时间前1小时，确保至少1小时的预约时长）
  let maxStartHour = endHour - 1  // 20 (21-1)
  let maxStartMinute = endMinute  // 0

  // 步骤4：处理分钟数边界情况（防止时间计算错误）
  if (maxStartMinute < currentMinute) {
    maxStartHour -= 1
    maxStartMinute += 60
  }

  // 步骤5：循环生成起始时间选项
  while (currentHour < maxStartHour || (currentHour === maxStartHour && currentMinute <= maxStartMinute)) {
    // 格式化时间字符串（补零）
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    // 🔥 关键步骤：时间限制过滤
    // 只有通过时间限制检查的时间才会被添加到选项中
    // 这里实现了实时过滤，确保用户只能看到真正可预约的时间
    if (isBookingTimeValid(date, timeStr)) {
      startOptions.push(timeStr)
    }

    // 步长控制：每次增加1小时
    currentHour += 1
  }

  // 步骤6：生成结束时间选项（从起始时间+1小时开始）
  let endCurrentHour = startHour + 1   // 19 (18+1)
  let endCurrentMinute = startMinute   // 0

  // 循环生成结束时间选项
  while (endCurrentHour < endHour || (endCurrentHour === endHour && endCurrentMinute <= endMinute)) {
    const timeStr = `${endCurrentHour.toString().padStart(2, '0')}:${endCurrentMinute.toString().padStart(2, '0')}`
    endOptions.push(timeStr)

    // 步长控制：每次增加1小时
    endCurrentHour += 1
  }

  // 步骤7：去重并排序（确保数据质量）
  const uniqueStartOptions = [...new Set(startOptions)].sort()
  const uniqueEndOptions = [...new Set(endOptions)].sort()

  return {
    startOptions: uniqueStartOptions,
    endOptions: uniqueEndOptions
  }
}

/**
 * Vue计算属性：可选开始时间段
 * @description 响应式计算属性，根据选择的日期动态生成开始时间选项
 * @reactive 依赖：currentDate.value（日期变化时自动重新计算）
 * @returns {string[]} 过滤后的开始时间选项数组
 * @performance Vue会自动缓存计算结果，只有依赖变化时才重新计算
 */
const timeOptions = computed(() => {
  const options = getTimeOptionsForDate(currentDate.value)
  return options.startOptions || []
})

/**
 * Vue计算属性：可选结束时间段
 * @description 响应式计算属性，根据日期和开始时间动态生成结束时间选项
 * @reactive 依赖：currentDate.value, startTime.value
 * @returns {string[]} 过滤后的结束时间选项数组
 * @constraint 限制条件：
 *   - 结束时间必须大于开始时间
 *   - 预约时长最多3小时
 *   - 不能超过当天的开放时间
 */
const endTimeOptions = computed(() => {
  const options = getTimeOptionsForDate(currentDate.value)

  // 边界条件检查：没有选择开始时间或没有结束时间选项
  if (!startTime.value || options.endOptions.length === 0) {
    // 🔥 修复逻辑错误：如果没有选择开始时间，应该返回空数组
    // 因为用户必须先选择开始时间，才能确定可选的结束时间范围
    return []
  }

  // 解析开始时间
  const [startHour, startMinute] = startTime.value.split(':').map(Number)

  // 计算最大结束时间（开始时间+3小时）
  const maxEndHour = startHour + 3
  const maxEndTime = `${maxEndHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`

  // 过滤结束时间选项：
  // 1. 不能超过3小时限制
  // 2. 必须大于第一个开始时间选项（确保时间顺序正确）
  return options.endOptions.filter(time => time <= maxEndTime && time > startTime.value)
})

// ==================== 响应式数据定义 ====================

/**
 * 当前选择的日期
 * @type {Ref<Date>}
 * @default 今天的日期
 * @reactive 这是一个响应式引用，变化时会触发相关计算属性重新计算
 */
const currentDate = ref(new Date()) // 默认选择今天

/**
 * 开始时间和结束时间的响应式引用
 * @type {Ref<string>}
 * @format "HH:mm" 格式的时间字符串
 */
const startTime = ref('18:00')
const endTime = ref('19:00')

// ==================== 初始化时间选择逻辑 ====================

/**
 * 根据当前日期类型初始化默认时间选择
 * @logic 初始化逻辑：
 *   - 工作日：默认选择18:00-21:00（晚上时段）
 *   - 周末：默认选择8:00-21:00（全天时段）
 * @note 这个逻辑在组件加载时执行一次，后续通过事件处理函数动态调整
 */
if(isWeekday(currentDate.value)) {
  startTime.value = '18:00'
  endTime.value = '21:00'
} else {
  startTime.value = '8:00'
  endTime.value = '21:00'
}

/**
 * 日期改变事件处理函数
 * @description 当用户选择新日期时触发，重置时间选择并检查场地可用性
 * @param {Date} date - 用户选择的新日期
 * @async 异步函数，包含API调用
 * @workflow 处理流程：
 *   1. 直接使用计算属性设置默认时间选择
 *   2. 计算属性会同步响应数据变化
 *   3. 调用场地可用性检查API
 * @triggered 触发时机：el-date-picker的@change事件
 * @note 计算属性是同步更新的，无需nextTick等待
 * @optimization 移除所有不必要的nextTick，提升性能
 */
const handleDateChange = async (date) => {
  // 🚀 最优化：所有计算属性都是同步更新，无需nextTick
  if (timeOptions.value.length > 0) {
    // 有可用时间：选择第一个可用的开始时间
    startTime.value = timeOptions.value[0]

    // 🎯 endTimeOptions会立即响应startTime的变化，无需等待
    // 设置结束时间为第一个可用的结束时间
    if (endTimeOptions.value.length > 0) {
      endTime.value = endTimeOptions.value[0]
    }
  } else {
    // 无可用时间：清空时间选择
    startTime.value = ''
    endTime.value = ''
  }

  // 检查场地可用性
  if (startTime.value && endTime.value && startTime.value < endTime.value) {
    await checkVenueAvailability(date, startTime.value, endTime.value)
  }
}

/**
 * 获取日期状态文本 - UI显示函数
 * @description 生成日期状态的描述文本，包含开放时间和时间限制信息
 * @param {Date} date - 目标日期
 * @returns {string} 完整的状态描述文本
 * @example
 *   工作日 → "工作日（仅晚上18:00-21:00开放）"
 *   周末 → "周末（全天开放8:00-21:00）"
 *   明天且当前<18:00 → "工作日（仅晚上18:00-21:00开放） - 不在可预约时间（明天场地需今天18:00后预约）"
 */
const getDateStatusText = (date) => {
  let statusText = ''

  // 基础状态文本（根据日期类型）
  if (isWeekday(date)) {
    statusText = '工作日（仅晚上18:00-21:00开放）'
  } else if (isWeekend(date)) {
    statusText = '周末（全天开放8:00-21:00）'
  }

  // 添加时间限制提示（如果有的话）
  const timeRestrictionText = getTimeRestrictionText(date)
  if (timeRestrictionText) {
    statusText += ` - ${timeRestrictionText}`
  }

  return statusText
}

const courts = ref([])
const loading = ref(false)

/**
 * 获取场地列表 - 初始化数据函数
 * @description 从API获取所有场地的基础信息，初始化场地状态
 * @async 异步函数，包含API调用
 * @workflow 处理流程：
 *   1. 设置加载状态
 *   2. 调用API获取场地数据
 *   3. 转换数据格式
 *   4. 初始化场地状态
 * @errorHandling 包含完整的错误处理和用户提示
 */
const fetchVenueList = async () => {
  loading.value = true
  try {
    const response = await getVenueList()
    if (response.data.code === 0) {
      // 转换API数据格式为组件需要的格式
      courts.value = response.data.data.map(venue => ({
        id: venue.id,
        name: venue.name,
        description: venue.description,
        price: venue.pricePerHour || 20, // 每小时价格
        status: venue.status,
        bookable: false, // 初始化为不可预约，等待时间选择后再检查
        availabilityReason: '请选择时间段', // 初始化原因
        location: venue.location,
      }))
    } else {
      ElMessage.error(response.message || '获取场地列表失败')
    }
  } catch (error) {
    console.error('获取场地列表失败:', error)
    ElMessage.error('获取场地列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 检查场地可用性 - 核心API调用函数
 * @description 综合检查时间限制和API数据，更新所有场地的可预约状态
 * @param {Date} date - 预约日期
 * @param {string} startTime - 开始时间
 * @param {string} endTime - 结束时间
 * @async 异步函数，包含API调用
 * @workflow 处理流程：
 *   1. 前置时间限制检查
 *   2. API调用获取场地数据
 *   3. 更新场地状态
 * @performance 前置检查避免无效API调用，提升性能
 */
const checkVenueAvailability = async (date, startTime, endTime) => {
  try {
    // 🔥 步骤1：前置时间限制检查（性能优化）
    // 先检查时间限制，避免无效的API调用
    const timeRestrictionText = getTimeRestrictionText(date)
    if (timeRestrictionText || !isBookingTimeValid(date, startTime)) {
      // 如果不在可预约时间，直接设置所有场地为不可预约
      courts.value.forEach(court => {
        court.bookable = false
        court.availabilityReason = timeRestrictionText || '不在可预约时间'
      })
      return  // 提前返回，避免API调用
    }

    // 步骤2：格式化日期用于API调用
    const dateStr = formatDateToString(date)

    // 步骤3：调用API获取场地可用性数据
    const response = await getVenueAvailability({
      date: dateStr,
      startTime,
      endTime
    })

    if (response.data.code === 0) {
      const { availableVenues, unavailableVenues } = response.data.data

      // 步骤4：重置所有场地的可预约状态
      courts.value.forEach(court => {
        court.bookable = false
        court.availabilityReason = '未知状态'
      })

      // 步骤5：设置可预约场地状态
      if (availableVenues && availableVenues.length > 0) {
        availableVenues.forEach(availableVenue => {
          const court = courts.value.find(c => c.id === availableVenue.id)
          if (court) {
            court.bookable = true
            court.availabilityReason = '可预约'
            // 更新场地价格信息（如果API返回了新的价格）
            if (availableVenue.pricePerHour !== undefined) {
              court.price = availableVenue.pricePerHour
            }
          }
        })
      }

      // 步骤6：设置不可预约场地状态
      if (unavailableVenues && unavailableVenues.length > 0) {
        unavailableVenues.forEach(unavailableVenue => {
          const court = courts.value.find(c => c.id === unavailableVenue.id)
          if (court) {
            court.bookable = false
            court.availabilityReason = unavailableVenue.reason || '不可预约'
          }
        })
      }
    }
  } catch (error) {
    console.error('检查场地可用性失败:', error)
    // 错误处理：API调用失败时，将所有场地设置为不可预约
    courts.value.forEach(court => {
      court.bookable = false
      court.availabilityReason = '检查失败'
    })
  }
}

/**
 * 组件挂载时的初始化逻辑
 * @description 组件加载时执行的初始化操作
 * @workflow 执行顺序：
 *   1. 获取场地列表数据
 *   2. 处理当前日期的时间选择
 *   3. 处理开始时间变化
 * @purpose 确保用户进入页面时看到正确的场地状态
 */
onMounted(async () => {
  await fetchVenueList()
  // 直接调用handleDateChange来初始化时间选择，避免重复代码
  await handleDateChange(currentDate.value)
  await handleStartTimeChange(startTime.value)
})

// ==================== 预约弹窗相关逻辑 ====================

/**
 * 预约弹窗的响应式状态管理
 * @type {Ref<boolean>} bookingDialogVisible - 弹窗显示状态
 * @type {Ref<Object|null>} selectedCourt - 当前选中的场地对象
 * @type {Ref<any>} createOrderFormRef - 创建订单表单的引用
 */
const bookingDialogVisible = ref(false)
const selectedCourt = ref(null)
const createOrderFormRef = ref(null)

/**
 * 打开预约弹窗
 * @description 选择场地并打开预约表单弹窗
 * @param {Object} court - 选中的场地对象
 * @workflow 设置选中场地并显示弹窗
 */
const openBookingDialog = (court) => {
  selectedCourt.value = court
  bookingDialogVisible.value = true
}

/**
 * 关闭预约弹窗
 * @description 关闭弹窗并清理状态
 * @workflow 隐藏弹窗并重置选中场地
 */
const closeBookingDialog = () => {
  bookingDialogVisible.value = false
  selectedCourt.value = null
}

/**
 * 取消预约操作
 * @description 用户取消预约时的处理函数
 * @workflow 直接调用关闭弹窗函数
 */
const cancelBooking = () => {
  closeBookingDialog()
}

// ==================== 场地使用情况矩阵弹窗相关逻辑 ====================

/**
 * 场地使用情况矩阵弹窗状态管理
 * @type {Ref<boolean>} matrixDialogVisible - 矩阵弹窗显示状态
 */
const matrixDialogVisible = ref(false)

/**
 * 关闭场地使用情况矩阵弹窗
 * @description 关闭矩阵弹窗
 */
const closeMatrixDialog = () => {
  matrixDialogVisible.value = false
}

/**
 * 打开场地使用情况表
 * @description 显示场地使用情况矩阵弹窗
 * @purpose 让用户查看所有场地的实时状态
 */
const openMatrixDialog = () => {
  matrixDialogVisible.value = true
}

/**
 * 检查场地是否可以预约 - 综合判断函数
 * @description 综合检查场地状态、时间选择和时间限制，判断场地是否可预约
 * @param {Object} court - 场地对象
 * @returns {boolean} true表示可预约，false表示不可预约
 * @logic 判断逻辑（多层检查）：
 *   1. 场地本身是否可用（court.bookable）
 *   2. 是否已选择时间（startTime && endTime）
 *   3. 是否符合时间限制规则（isBookingTimeValid）
 * @usage 用于控制预约按钮的启用/禁用状态
 */
const isCourtBookable = (court) => {
  // 第一层检查：场地本身是否可用
  if (!court.bookable) {
    return false
  }

  // 第二层检查：是否已选择时间
  if (!startTime.value || !endTime.value) {
    return false
  }

  // 第三层检查：是否符合时间限制规则
  return isBookingTimeValid(currentDate.value, startTime.value)
}

/**
 * 获取场地状态对应的CSS类名 - UI样式函数
 * @description 根据场地的可预约状态返回对应的CSS类名
 * @param {Object} court - 场地对象
 * @returns {string} CSS类名
 * @mapping 状态映射：
 *   - 可预约：'status-available'（绿色边框）
 *   - 不可预约：'status-booked'（红色边框）
 *   - 其他状态：'status-closed'（灰色边框）
 * @usage 用于el-card的动态class绑定
 */
const getStatusClass = (court) => {
  if (court.bookable) {
    return 'status-available'
  } else if (court.availabilityReason && court.availabilityReason !== '请选择时间段') {
    return 'status-booked'
  } else {
    return 'status-closed'
  }
}

/**
 * 获取场地状态显示文本 - UI显示函数
 * @description 根据场地状态返回用户友好的状态文本
 * @param {Object} court - 场地对象
 * @returns {string} 状态显示文本
 * @logic 显示逻辑：
 *   - 可预约：显示"可预约"
 *   - 不可预约：显示具体原因（availabilityReason）
 * @usage 用于场地卡片中的状态显示
 */
const getStatusText = (court) => {
  if (court.bookable) {
    return '可预约'
  } else {
    return court.availabilityReason || '状态未知'
  }
}

/**
 * 预约成功回调函数
 * @description 当用户成功创建预约订单后的处理函数
 * @async 异步函数，包含状态更新
 * @workflow 处理流程：
 *   1. 关闭预约弹窗
 *   2. 显示成功提示
 *   3. 重新检查场地可用性（更新状态）
 * @purpose 确保预约成功后界面状态正确更新
 */
const handleBookingSuccess = async () => {
  // 关闭预约弹窗
  closeBookingDialog()

  // 显示成功提示
  ElMessage.success('预约成功！')

  // 重新检查场地可用性，更新场地状态
  if (startTime.value && endTime.value) {
    await checkVenueAvailability(currentDate.value, startTime.value, endTime.value)
  }
}

/**
 * 开始时间变化事件处理函数
 * @description 当用户选择新的开始时间时触发，自动调整结束时间并检查场地可用性
 * @param {string} time - 新选择的开始时间
 * @async 异步函数，包含API调用
 * @workflow 处理流程：
 *   1. 获取当前日期的时间选项
 *   2. 检查并调整结束时间
 *   3. 重新检查场地可用性
 * @constraint 约束条件：
 *   - 结束时间必须大于开始时间
 *   - 预约时长不超过3小时
 */
const handleStartTimeChange = async (time) => {
  if (timeOptions.value.length === 0) return

  if (time >= endTime.value) {
    endTime.value = endTimeOptions.value[0]
  }

  const endHour = endTime.value.split(':').map(Number)[0]
  const startTimeHour = time.split(':').map(Number)[0]

  if (endHour - startTimeHour > 3) {
    endTime.value = endTimeOptions.value[endTimeOptions.value.length - 1]
  }

  // 重新检查场地可用性
  if (endTime.value) {
    await checkVenueAvailability(currentDate.value, time, endTime.value)
  }
}

/**
 * 结束时间变化事件处理函数
 * @description 当用户选择新的结束时间时触发，确保时间逻辑正确并检查场地可用性
 * @param {string} time - 新选择的结束时间
 * @async 异步函数，包含API调用
 * @workflow 处理流程：
 *   1. 检查时间顺序是否正确
 *   2. 必要时调整开始时间
 *   3. 重新检查场地可用性
 * @constraint 约束条件：结束时间必须大于开始时间
 */
const handleEndTimeChange = async (time) => {
  // 如果结束时间小于等于开始时间，需要自动调整开始时间
  if (time <= startTime.value) {
    if (isWeekday(currentDate.value)) {
      // 工作日：根据结束时间的位置调整开始时间
      const endTimeIndex = endTimeOptions.value.indexOf(time)
      startTime.value = timeOptions.value[endTimeIndex]
    } else {
      // 周末：设置默认开始时间
      startTime.value = '18:00'
    }
  }

  // 重新检查场地可用性
  if (startTime.value) {
    await checkVenueAvailability(currentDate.value, startTime.value, time)
  }
}
</script>

<template>
  <div class="booking-container">
    <div class="page-header">
      <h2>场地预约</h2>
    </div>

    <!-- 通知公告区域 -->
    <NoticeList />

    <div class="booking-tools">
      <div class="date-time-selector">
        <div class="selector-group">
          <p>选择日期：</p>
          <!--
            【核心组件】日期选择器 - 业务规则限制实现
            @功能：限制用户只能选择今天和明天的日期
            @限制逻辑：通过disabled-date函数实现日期过滤
            @事件处理：@change触发handleDateChange，重置时间选择并检查场地可用性
            @格式化：显示为"YYYY年MM月DD日"格式，提升用户体验
          -->
          <el-date-picker
            v-model="currentDate"
            type="date"
            placeholder="选择预约日期"
            :disabled-date="
              (time) => {
                // 创建今天的日期对象（时间重置为00:00:00）
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                // 创建明天的日期对象
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)

                // 只允许选择今天和明天，其他日期都禁用
                // 使用toDateString()比较日期字符串，避免时间部分的干扰
                return !(time.toDateString() === today.toDateString() ||
                        time.toDateString() === tomorrow.toDateString())
              }
            "
            format="YYYY年MM月DD日"
            @change="handleDateChange"
          />
        </div>

        <!-- 查看场地使用情况表按钮 - 新位置 -->
        <div class="matrix-button-container">
          <el-button
            type="primary"
            :icon="Calendar"
            @click="openMatrixDialog"
            class="matrix-button-enhanced"
            size="large"
          >
            <span class="button-text">查看场地使用情况表</span>
            <span class="button-subtitle">实时查看所有场地状态</span>
          </el-button>
        </div>

        <!--
          【状态显示】日期状态信息
          @功能：显示当前选择日期的开放时间和限制信息
          @数据源：getDateStatusText()函数动态计算
          @示例：
            - 工作日："工作日（仅晚上18:00-21:00开放）"
            - 周末："周末（全天开放8:00-21:00）"
            - 限制时："工作日（仅晚上18:00-21:00开放） - 不在可预约时间（明天场地需今天18:00后预约）"
        -->
        <div class="date-status">
          <span class="status-text">{{ getDateStatusText(currentDate) }}</span>
        </div>

        <!--
          【核心组件】时间选择器组合 - 智能时间管理
          @显示条件：v-if="timeOptions.length > 0" 只有存在可选时间时才显示
          @功能：双时间选择器（开始时间 + 结束时间）
          @智能联动：
            - 开始时间变化时自动调整结束时间
            - 结束时间变化时自动调整开始时间
            - 确保时间逻辑正确（结束时间 > 开始时间）
            - 限制预约时长不超过3小时
        -->
        <div class="selector-group time-selector" v-if="timeOptions.length > 0">
          <p>时间段：</p>
          <div class="time-picker-container">
            <!--
              【开始时间选择器】
              @数据源：timeOptions（计算属性，已过滤时间限制）
              @事件：@change="handleStartTimeChange" 触发时间调整和场地检查
              @特性：选项已通过isBookingTimeValid()过滤，确保用户只能选择可预约时间
            -->
            <div class="time-picker">
              <el-select
                v-model="startTime"
                placeholder="开始时间"
                @change="handleStartTimeChange"
                class="time-select"
              >
                <el-option
                  v-for="time in timeOptions"
                  :key="time"
                  :label="time"
                  :value="time"
                ></el-option>
              </el-select>
            </div>
            <span class="time-separator">至</span>
            <!--
              【结束时间选择器】
              @数据源：endTimeOptions（计算属性，基于开始时间动态过滤）
              @事件：@change="handleEndTimeChange" 触发时间调整和场地检查
              @约束：
                - 必须大于开始时间
                - 不能超过3小时限制
                - 不能超过当天开放时间
            -->
            <div class="time-picker">
              <el-select
                v-model="endTime"
                placeholder="结束时间"
                @change="handleEndTimeChange"
                class="time-select"
              >
                <el-option
                  v-for="time in endTimeOptions"
                  :key="time"
                  :label="time"
                  :value="time"
                ></el-option>
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <!--
        【业务规则说明】预约规则展示
        @功能：向用户清晰展示所有预约规则和限制
        @作用：减少用户疑问，提升用户体验
        @内容：包含时间限制、预约规则、费用说明等
      -->
      <div class="booking-rules">
        <p><strong>预约规则：</strong></p>
        <ul>
          <li>工作日（周一至周五）：白天场地用于校内上课，仅晚上18:00-21:00开放预约</li>
          <li>周末（周六、周日）：全天开放预约，时间为8:00-21:00</li>
          <li>预约时长为1-3小时，每小时20元，时间选择步长为1小时</li>
          <li>一人一天只能预约一次，如果当天已预约则无法再次预约</li>
          <li>只能预约今天和明天的场地</li>
          <li>今天场地：只要在开始时间之前都可以预约（如果有剩余）</li>
          <li>明天场地：今天18:00之后才能开始预约</li>
        </ul>
      </div>
    </div>

    <!--
      【场地展示区域】场地状态列表
      @功能：展示所有场地的实时状态和预约按钮
      @响应式：使用el-row和el-col实现响应式布局
      @状态管理：每个场地卡片根据可预约状态显示不同样式
    -->
    <div class="courts-container">
      <h3>场地状态</h3>

      <!--
        【加载状态】骨架屏展示
        @条件：v-if="loading" 数据加载中时显示
        @组件：el-skeleton 提供流畅的加载体验
        @用户体验：避免白屏，提供视觉反馈
      -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
        <p class="loading-text">正在加载场地信息...</p>
      </div>

      <!--
        【场地列表】响应式场地卡片网格
        @条件：v-else 数据加载完成后显示
        @布局：响应式网格布局（xs=24, sm=12, md=8）
        @数据源：courts数组，包含所有场地信息和状态
      -->
      <el-row v-else :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="court in courts" :key="court.id">
          <!--
            【场地卡片】单个场地的状态展示
            @样式：动态class基于场地状态（getStatusClass）
            @内容：场地名称、状态、描述、价格、预约按钮
            @交互：点击预约按钮触发预约流程
          -->
          <el-card class="court-card" :class="getStatusClass(court)">
            <div class="court-info">
              <div class="court-name">{{ court.name }}</div>
              <!--
                【状态显示】场地当前状态文本
                @数据源：getStatusText(court)函数动态计算
                @状态类型：可预约、已预约、不在可预约时间、检查失败等
              -->
              <div class="court-status">{{ getStatusText(court) }}</div>
              <div class="court-description">{{ court.description }}</div>
              <div class="court-price">¥{{ court.price }}/小时</div>
              <!--
                【预约按钮】核心交互组件
                @启用条件：isCourtBookable(court) 综合判断函数
                @判断逻辑：
                  1. 场地本身可用
                  2. 已选择时间
                  3. 符合时间限制规则
                @点击事件：openBookingDialog(court) 打开预约弹窗
              -->
              <el-button
                type="primary"
                :disabled="!isCourtBookable(court)"
                @click="openBookingDialog(court)"
                class="book-button"
              >
                {{ isCourtBookable(court) ? '立即预约' : '暂不可预约' }}
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!--
      【预约弹窗】创建订单表单弹窗
      @功能：收集用户信息并创建预约订单
      @组件：CreateOrderForm 独立的表单组件
      @数据传递：传递选中的场地、日期、时间信息
      @事件处理：成功预约后刷新场地状态
    -->
    <el-dialog
      v-model="bookingDialogVisible"
      :title="`预约 ${selectedCourt?.name}`"
      width="600px"
      @close="closeBookingDialog"
    >
      <CreateOrderForm
        v-if="selectedCourt"
        ref="createOrderFormRef"
        :court="selectedCourt"
        :date="currentDate"
        :start-time="startTime"
        :end-time="endTime"
        @success="handleBookingSuccess"
        @cancel="cancelBooking"
      />
    </el-dialog>

    <!--
      【场地使用情况矩阵弹窗】全局场地状态查看
      @功能：以表格形式展示所有场地的使用情况
      @组件：VenueStatusMatrix 独立的矩阵组件
      @用途：帮助用户快速了解所有场地的可用性
    -->
    <el-dialog
      v-model="matrixDialogVisible"
      title="场地使用情况表"
      width="90%"
      @close="closeMatrixDialog"
    >
      <VenueStatusMatrix
        v-if="matrixDialogVisible"
        :current-date="currentDate"
        :start-time="startTime"
        :end-time="endTime"
      />
    </el-dialog>
  </div>
</template>

<style lang="less" scoped>
.booking-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
}

h2 {
  text-align: center;
  color: #2b6fc2;
  margin-bottom: 0;
}

h3,
h4,
h5 {
  color: #2b6fc2;
  margin: 20px 0;
}

h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

.booking-tools {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  margin-top: 40px;
}

.date-time-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.selector-group {
  display: flex;
  align-items: center;
}

.selector-group p {
  margin-right: 10px;
  margin-bottom: 0;
  white-space: nowrap;
}

.time-selector {
  flex-wrap: wrap;
}

.time-picker-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-picker {
  display: flex;
  align-items: center;
}

.time-separator {
  margin: 0 5px;
}

.time-select {
  width: 120px;
}

.price-info-group {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.booking-hours-info,
.booking-price-info {
  font-size: 14px;
  margin-bottom: 5px;
}

.highlight {
  color: #2b6fc2;
  font-weight: bold;
}

.courts-container {
  margin: 30px 0;
}

.court-card {
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.court-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.court-info {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.court-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.court-status {
  font-size: 14px;
}

.court-price {
  font-size: 12px;
  color: #f56c6c;
  font-weight: bold;
  margin-top: 5px;
}

.court-actions {
  display: flex;
  justify-content: center;
}

.status-available {
  border-left: 4px solid #67c23a;
}

.status-available .court-status {
  color: #67c23a;
}

.status-booked {
  border-left: 4px solid #f56c6c;
}

.status-booked .court-status {
  color: #f56c6c;
}

.status-occupied {
  border-left: 4px solid #e6a23c;
}

.status-occupied .court-status {
  color: #e6a23c;
}

.booking-legend {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 0 15px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 8px;
}

.legend-color.available {
  background-color: #67c23a;
}

.legend-color.booked {
  background-color: #f56c6c;
}

.legend-color.occupied {
  background-color: #e6a23c;
}

.legend-color.closed {
  background-color: #909399;
}

/* 预约弹窗样式 */
.dialog-footer {
  text-align: right;
  margin-top: 20px;
}

@media screen and (max-width: 768px) { //当在任何屏幕设备上，且屏幕宽度不超过768像素时，应用这些样式
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .matrix-button-container {
    margin: 15px 0;
    width: 100%;
  }

  .matrix-button-enhanced {
    min-width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .date-time-selector {
    flex-direction: column;
    gap: 15px;
  }

  .selector-group {
    width: 100%;
  }

  .time-picker-container {
    flex-wrap: wrap;
  }

  .price-info-group {
    margin-left: 0;
    align-items: flex-start;
  }
}

.booking-rules {
  margin-top: 15px;
  font-size: 13px;
  color: #909399;

  p {
    margin-bottom: 10px;
    font-weight: bold;
    color: #333;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  }
}

.date-status {
  margin-left: 15px;

  .status-text {
    font-size: 14px;
    color: #666;
    background-color: #f5f5f5;
    padding: 5px 10px;
    border-radius: 4px;
  }
}

.status-closed {
  border-left: 4px solid #909399;
}

.status-closed .court-status {
  color: #909399;
}

/* 新的增强按钮样式 */
.matrix-button-container {
  display: flex;
  justify-content: center;
  margin: 0 20px;
}

.matrix-button-enhanced {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  min-width: 280px;
  height: auto;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.matrix-button-enhanced:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
  background: linear-gradient(135deg, #66b1ff 0%, #85ce61 100%);
}

.matrix-button-enhanced:active {
  transform: translateY(0);
}

.matrix-button-enhanced .button-text {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.matrix-button-enhanced .button-subtitle {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.matrix-button-enhanced::before {
  /* 创建一个伪元素，用于实现按钮的光泽扫过动画效果 */
  // 视觉效果：用户看到一道白色光泽从左到右快速扫过按钮表面
  content: '';                    /* 必须设置content才能显示伪元素 */
  position: absolute;             /* 绝对定位，相对于父元素（按钮）定位 */
  top: 0;                        /* 从按钮顶部开始 */
  left: -100%;                   /* 初始位置在按钮左侧外部（完全隐藏） */
  width: 100%;                   /* 宽度与按钮相同 */
  height: 100%;                  /* 高度与按钮相同 */
  /* 创建从透明到半透明白色再到透明的水平渐变，形成光泽条效果 */
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;         /* 设置left属性的过渡动画，持续0.5秒 */
}

.matrix-button-enhanced:hover::before {
  left: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-text {
  margin-top: 10px;
  color: #909399;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #909399;
}
</style>
