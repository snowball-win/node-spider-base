const cheerio = require('cheerio')
const axios = require('axios')
const url = require('url')
const fs = require('fs')

const request = axios.create({
  baseURL: 'https://money.163.com/' // 网易财经商讯
})

// 获取最后一页的页面数
const getLastPage = async () => {
  const { data } = await request({
    method: 'GET',
    url: '/special/businessnews/', // 新闻列表首页
  })

  const $ = cheerio.load(data)
  const paginations = $('.index_pages a') // 分页区域
  const lastPageHref = paginations.eq(paginations.length - 2).attr('href')
  return Number(lastPageHref.split("/")[4].split("_")[1])
}

// 需求：获取 网易财经商讯网站 所有的文章列表（文章标题、文章内容）并且将该数据存储到数据库中

// 获取所有文章列表
const getArticles = async () => {
  const lastPage = await getLastPage()
  console.log('28', lastPage)
  const links = []
  for (let page = 1; page <= lastPage; page++) {
    let url = "special/businessnews/"
    if(page > 1 && page <= 9){
      url = `special/businessnews_0${page}/`
    } else if(page > 9){
      url = `special/businessnews_${page}/`
    }
    const { data } = await request({
      method: 'GET',
      url: url,
    })
    const $ = cheerio.load(data)
    $('.index_list a').each((index, element) => {
      const item = $(element) // 转换为 $ 元素
      links.push(item.attr('href'))
    })
    // 每次抓取完一页的数据就等待一段时间，太快容易被发现
    await new Promise(resolve => {
      setTimeout(resolve, 1000)
    })
    console.log("links.length", links.length)
  }
  return links
}

// 获取文章内容
const getArticleContent = async (url) => {
  const { data } = await request({
    method: 'GET',
    url
  })
  const $ = cheerio.load(data)
  const title = $('.post_title').text().trim()
  const content = $('.post_body').html()
  return {
    title,
    content
  }
}

const main = async () => {
  // 1. 获取所有文章列表链接
  const articles = await getArticles()
  // 2. 遍历文章列表
  for (let i = 0; i < articles.length; i++) {
    const link = articles[i]
    const article = await getArticleContent(link)
      // 生产环境可以存到数据库里边了
      fs.appendFileSync('./db.txt', `
      标题：${article.title}
      文章内容：${article.content}
      \r\n\r\n\r\n\r\n
    `)
    console.log(`${link} 抓取完成`)
    await wait(500)
  }
}

main()

function wait (time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}