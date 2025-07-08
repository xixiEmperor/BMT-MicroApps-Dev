/**
 * DFA（确定有限状态自动机）敏感词过滤算法
 *
 * 算法原理：
 * 1. 将敏感词构建成一个树状结构（字典树/前缀树）
 * 2. 每个节点代表一个字符，从根节点到叶子节点的路径构成一个敏感词
 * 3. 使用Map结构存储树，key为字符，value为下一层的Map
 * 4. 通过标识符区分中间节点和结束节点
 */

// 敏感词列表 - 可根据实际需求进行扩展
const sensitiveWordList = ['王八', '王八蛋', '王八羔子', 'fuck', 'shit', '傻逼', '傻叉', '傻子', '傻缺']

/**
 * 初始化敏感词字典树
 * 将敏感词列表转换为DFA状态机的树结构
 *
 * 数据结构说明：
 * - 使用嵌套Map结构构建字典树
 * - 每个Map的key为字符，value为下一层的Map
 * - 特殊标识符：
 *   - 'laster': boolean - 标识当前节点是否为叶子节点（true表示叶子节点，false表示有子节点）
 *   - 'lastDigit': boolean - 标识当前节点是否为敏感词的结束节点
 *
 * @returns {Map} 敏感词字典树的根节点
 */
export const initSensitiveWord = () => {
  // 创建字典树的根节点
  const sensitiveWordMap = new Map()

  // 遍历每个敏感词，将其插入到字典树中
  for(const word of sensitiveWordList) {
    let currentMap = sensitiveWordMap // 当前操作的节点，从根节点开始

    // 遍历敏感词的每个字符
    for(let i = 0; i < word.length; i++) {
      const char = word[i] // 当前字符

      if(currentMap.get(char)) {
        // 如果当前字符已经存在于当前节点中，直接进入下一层
        currentMap = currentMap.get(char)
      } else {
        // 如果当前字符不存在，需要创建新的节点

        // 如果当前节点之前被标记为叶子节点，现在需要更新为非叶子节点
        if(currentMap.get('laster') === true) {
          currentMap.set('laster', false)
        }

        // 创建新的子节点
        const item = new Map()
        item.set('laster', true) // 初始化为叶子节点，后续如果有子节点会更新为false

        // 将新节点添加到当前节点中
        currentMap.set(char, item)
        // 移动到新创建的节点
        currentMap = currentMap.get(char)
      }

      // 如果已经遍历到敏感词的最后一个字符，标记为敏感词结束节点
      if(word.length === i + 1){
        currentMap.set('lastDigit', true)
      }
    }
  }
  return sensitiveWordMap
}

// 创建全局的敏感词字典树实例
export const sensitiveWordMap = initSensitiveWord()

/**
 * 检查从指定位置开始是否存在敏感词
 * 使用DFA算法进行状态转移，匹配敏感词
 *
 * @param {Map} sensitiveWordMap - 敏感词字典树
 * @param {string} txt - 待检查的文本
 * @param {number} index - 开始检查的位置索引
 * @returns {Object} 检查结果
 *   - flag: boolean - 是否找到敏感词
 *   - sensitiveWord: string - 找到的敏感词内容
 */
export const checkSensitiveWord = (sensitiveWordMap, txt, index) => {
  let currentMap = sensitiveWordMap // 当前状态节点，从根节点开始
  let flag = false // 是否找到敏感词的标识
  let sensitiveWord = '' // 匹配到的敏感词内容

  // 从指定位置开始遍历文本
  for(let i = index; i < txt.length; i++) {
    const char = txt[i] // 当前字符

    // 尝试进行状态转移
    currentMap = currentMap.get(char)

    if(currentMap){
      // 如果能够成功转移到下一个状态
      sensitiveWord += char // 累积匹配的字符

      // 检查是否到达敏感词的结束状态
      if(currentMap.get('laster') || currentMap.get('lastDigit')){
        flag = true // 找到完整的敏感词
        break
      }
    } else {
      // 如果无法转移到下一个状态，说明当前路径不匹配任何敏感词
      break
    }
  }

  return {
    flag,
    sensitiveWord
  }
}

/**
 * 过滤文本中的敏感词
 * 对整个文本进行扫描，检测是否包含敏感词
 *
 * @param {string} txt - 待过滤的原始文本
 * @param {Map} sensitiveMap - 敏感词字典树
 * @returns {Object} 过滤结果
 *   - flag: boolean - 文本中是否包含敏感词
 *   - sensitiveWord: string - 找到的第一个敏感词
 */
export const filterSensitiveWord = (txt, sensitiveMap) => {
  // 初始化匹配结果
  let matchResult = {
    flag: false,
    sensitiveWord: ""
  };

  // 数据预处理：过滤掉除了中文、英文、数字之外的字符
  // 正则表达式说明：
  // \u4e00-\u9fa5: 中文字符范围
  // \u0030-\u0039: 数字字符范围 (0-9)
  // \u0061-\u007a: 小写英文字母范围 (a-z)
  // \u0041-\u005a: 大写英文字母范围 (A-Z)
  const txtTrim = txt.replace(
    /[^\u4e00-\u9fa5\u0030-\u0039\u0061-\u007a\u0041-\u005a]+/g,
    ""
  );

  // 遍历处理后的文本，从每个位置开始检查是否存在敏感词
  for (let i = 0; i < txtTrim.length; i++) {
    // 从当前位置开始检查敏感词
    matchResult = checkSensitiveWord(sensitiveMap, txtTrim, i);

    if (matchResult.flag) {
      // 如果找到敏感词，输出日志并停止检查
      console.log(`sensitiveWord:${matchResult.sensitiveWord}`);
      break;
    }
  }

  return matchResult;
}
