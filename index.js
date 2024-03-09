const waterfallcontainerDom = document.querySelector('.water-fall-container')
const containerDom = document.querySelector('.container')
const loadingDom = document.querySelector('.loading')
const gotoTopDom = document.querySelector('.to-top')
const canvas = document.createElement('canvas')
const getTextLineHeightCtx = canvas.getContext('2d')
getTextLineHeightCtx.font = '16px sans-serif'

let list = []
let page = 1
let pageSize = 50
let hasNextPage = true
let gap = 16
let columnWidth = 0
let containerTop = 0
let domDataList = []
let positionList = []
let renderMap = {}
let startIdx = 0
let endIdx = 0
// 偏移量
const screenOffset = waterfallcontainerDom.offsetHeight / 2
// 是否加载下一页数据
let isLoadNextPage = false
const testList = [
  '当记忆的线缠绕过往支离破碎',
  '是慌乱占据了心扉，有花儿伴着蝴蝶, 孤燕可以双飞，夜深人静独徘徊',
  '当幸福恋人寄来红色分享喜悦，闭上双眼难过头也不敢回，仍然拣尽寒枝不肯安歇微带着后悔, 寂寞沙洲我该思念谁',
]

// 获取数据
const getList =  () => {
  return new Promise(resolve => {
    const start = (page - 1) * pageSize
    const nextList = window.WHList.slice(start, start + pageSize)
    hasNextPage = !!nextList.length
    list = page === 1 ? nextList : list.concat(nextList)
    setTimeout(() => {
      resolve(nextList)
    }, page === 1 ? 0 : 2000) // 模拟发送请求
  })
}

// 计算数据形成 排序表
const computeDomData = (list, startRenderIdx = 0) => {
  const tempDomDataList = []
  // const now = Date.now()
  for (let i = 0; i < list.length; i++) {
    const param = {
      idx: startRenderIdx + i,
      columnIdx: 0,
      width: columnWidth,
      height: list[i].h * columnWidth / list[i].w,
      left: 0,
      top: 0,
      text: testList[Math.trunc(Math.random() * 3)],
      lineHeight: 74,// 根据css设置的值计算得到
    }
    // 排序，第一项必定是长度最短的一列
    positionList.sort((a, b) => a.columnHeight - b.columnHeight)
    param.columnIdx = positionList[0].columnIdx
    param.left = (param.columnIdx - 1) * (gap + columnWidth)
    param.top = positionList[0].columnHeight
    // css 样式表设置了 纵坐标的12px内边距，要加上
    param.lineHeight = getTextLineHeightCtx.measureText(param.text).width + 24 > columnWidth ? 98 : 78
    param.height += param.lineHeight
    positionList[0].columnHeight += param.height + gap
    tempDomDataList.push(param)
  }
  domDataList = domDataList.concat(tempDomDataList)
  setContainerHeight()
  // console.log('computeDomData time:', Date.now() - now, positionList, domDataList)
}

// 根据元素列表进行渲染
const renderDomByDomDataList = (startRenderIdx = 0) => {
  if (!domDataList.length) return
  const tempRenderMap = {}
  let topIdx = startRenderIdx
  let bottomIdx = startRenderIdx
  const now = Date.now()
  // 处于这两条线之间的元素将被渲染进容器
  for (let i = startRenderIdx; i < domDataList.length; i++) {
    const { idx } = domDataList[i]
    const { overTopLine, underBottomLine } = checkIsRender(domDataList[i])
    const dom = containerDom.querySelector(`#item_${idx}`)
    if (overTopLine || underBottomLine) {
      dom?.remove()
      continue
    }
    topIdx = topIdx < idx ? topIdx : idx
    bottomIdx = bottomIdx < idx ? idx : bottomIdx

    if (dom) {
      tempRenderMap[idx] = createDom(dom, domDataList[i])
    } else {
      tempRenderMap[idx] = createDom(document.createElement('div'), domDataList[i])
      containerDom.append(tempRenderMap[idx])
    }
  }
  const keys = Object.keys(Object.assign(renderMap, tempRenderMap))
  startIdx = +keys[0]
  endIdx = +keys[keys.length - 1]
  console.log('renderDom time:', startIdx, endIdx, Date.now() - now)
}

// 设置容器高度
const setContainerHeight = () => {
  positionList.sort((a, b) => a.columnHeight - b.columnHeight)
  containerDom.style.height = positionList[positionList.length - 1].columnHeight + 32 + 'px'
}

// 根据容器宽度获取显示列数（自由发挥）
const getColumnNum = (boxWidth) => {
  if (boxWidth >= 1600) return 5
  else if (boxWidth >= 1200) return 4
  else if (boxWidth >= 768 && boxWidth < 1200) return 3
  else return 2
}

// 计算瀑布流每一列列宽
const computeColumnWidth = () => {
  // 首先计算应呈现的列数
  const columnNum = getColumnNum(window.innerWidth)
  const allGapLength = gap * (columnNum - 1)
  columnWidth = (containerDom.offsetWidth - allGapLength) / columnNum
}

// 重置瀑布流每一列数据
const initPositionList = () => {
  positionList = []
  // 首先计算应呈现的列数
  for (let i = 0; i < getColumnNum(window.innerWidth); i++) {
    positionList.push({
      columnIdx: i + 1,
      columnHeight: 0
    })
  }
}

// 创建瀑布流每一项  dom元素
const createDom = (dom, param) => {
  dom.classList.add('waterfall-item')
  dom.style.width = param.width + 'px'
  dom.style.height = param.height + 'px'
  dom.style.transform = `translate(${param.left}px, ${param.top}px)`
  dom.id = `item_${param.idx}`
  dom.innerHTML = `
        <div class="main">${param.idx}</div>
        <div class="footer" style="height: ${param.lineHeight}px">
          <div class="text">${param.text}</div>
          <div class="info">@小刚老师 -《寂寞沙洲冷》</div>
        </div>`
  return dom
}

// 计算元素是否符合渲染条件
const checkIsRender = (params) => {
  const { top, height } = params
  const y = top + height + containerTop
  // 1个视口的数据再快速滚动滚动条时大概率会有加载项，不妨扩大到上下各0.5个视口，共2个视口内的数据，这样就比较丝滑了，这里也是自由发挥
  const topLine = waterfallcontainerDom.scrollTop - screenOffset
  const bottomLine = waterfallcontainerDom.scrollTop + waterfallcontainerDom.offsetHeight + screenOffset
  // 是否在上线之上
  const overTopLine = topLine > y
  // 是否在下线之下
  const underBottomLine = top > bottomLine
  // // 是否在两线之内
  // const inLineZoom = y > topLine && y < bottomLine
  // // 是否与上线相交
  // const intersectTopLine = top + containerTop <= topLine && y > topLine
  // // 是否与下线相交
  // const intersectBottomLine = top + containerTop <= bottomLine && y > bottomLine
  return{
    overTopLine,
    underBottomLine,
    //   inLineZoom,
    //   intersectTopLine,
    //   intersectBottomLine
  }
}

// 当滚动条滚动时，更新容器内的 每一项 元素是 插入 还是 删除
const updateDomPosition = (direction = 1) => {
  const now = Date.now()
  const tempRenderMap = {}
  // 检查已渲染列表中的元素，不符合条件删除元素，反之插入元素
  for (let i = startIdx; i <= endIdx; i++) {
    const { overTopLine, underBottomLine } = checkIsRender(domDataList[i])
    if (overTopLine || underBottomLine) {
      renderMap[i]?.remove()
    } else if (renderMap[i]) {
      tempRenderMap[i] = renderMap[i]
    } else {
      tempRenderMap[i] = createDom(document.createElement('div'), domDataList[i])
      containerDom.append(tempRenderMap[i])
    }
  }
  // 向上
  if (direction < 0) {
    for (let i = startIdx - 1; i >= 0; i--) {
      const { overTopLine } = checkIsRender(domDataList[i])
      if (overTopLine) break
      tempRenderMap[i] = createDom(document.createElement('div'), domDataList[i])
      containerDom.append(tempRenderMap[i])
    }
  } else { // 向下
    for(let i = endIdx + 1; i < domDataList.length; i++) {
      const { underBottomLine } = checkIsRender(domDataList[i])
      // 只要找到Bottom在下线之下的立即停止
      if (underBottomLine) break
      tempRenderMap[i] = createDom(document.createElement('div'), domDataList[i])
      containerDom.append(tempRenderMap[i])
    }
  }
  renderMap = tempRenderMap
  const keys = Object.keys(renderMap)
  startIdx = +keys[0]
  endIdx = +keys[keys.length - 1]
  console.log('updateDomPosition time:', startIdx, endIdx, Date.now() - now)
}

let lastOffsetWidth = window.innerWidth
let resizeCallback = null
const resizeFn = () => {
  computeColumnWidth()
  // 如果宽度发生变化时，若列宽是一致的不用处理
  if (lastOffsetWidth !== window.innerWidth && columnWidth === domDataList[0]?.width) return
  lastOffsetWidth = window.innerWidth
  initPositionList()
  domDataList = []
  renderMap = {}
  computeDomData(list, 0)
  renderDomByDomDataList(0)
}

// 窗口变化事件
const resize = window.debounce(() => {
  // 加载数据时发生了视口变化，保存回调
  if (isLoadNextPage) {
    resizeCallback = resizeFn
    return
  }
  resizeFn()
}, 150)

// 上次滚动距离Y
let lastScrollNumY = 0
// 上次滚动距离X
let lastScrollNumX = 0
// 上次滚动方向 向下 为 1，向上为 -1
let scrollDirection = 1
// 窗口滚动事件
const handleScroll = window.throttle(async () => {
  // 过滤掉x轴滚动条
  // if (window.scrollX !== lastScrollNumX) {
  //   lastScrollNumX = window.scrollX
  //   return
  // }
  waterfallcontainerDom.scrollTop >= window.innerHeight ? gotoTopDom.classList.add('active') : gotoTopDom.classList.remove('active')
  scrollDirection = waterfallcontainerDom.scrollTop - lastScrollNumY >= 0 ? 1 : -1
  lastScrollNumY = waterfallcontainerDom.scrollTop
  updateDomPosition(scrollDirection)
  if (isLoadNextPage || !hasNextPage) return false
  if (waterfallcontainerDom.scrollTop + waterfallcontainerDom.offsetHeight >= waterfallcontainerDom.scrollHeight * 0.85) {
    isLoadNextPage = true
    loadingDom.classList.add('active')
    page += 1
    const list = await getList()
    isLoadNextPage = false
    loadingDom.classList.remove('active')
    // 加载数据期间发生了视口变化时，执行一次回调
    if (resizeCallback) {
      resizeCallback()
      resizeCallback = null
    } else {
      // 节点信息排列完毕后进行渲染
      const startIdx = (page - 1) * pageSize
      computeDomData(list, startIdx)
      renderDomByDomDataList(startIdx)
    }
  }
}, 150)

// 渠道顶部
gotoTopDom.onclick = () => {
  waterfallcontainerDom.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth"
  })
}
waterfallcontainerDom.addEventListener('scroll', handleScroll)
window.addEventListener('resize', resize)

;(async function() {
  computeColumnWidth()
  initPositionList()
  computeDomData(await getList(), 0)
  // 节点信息排列完毕后进行渲染
  renderDomByDomDataList(0)
})()
