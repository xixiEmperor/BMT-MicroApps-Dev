/**
 * 路由配置
 * - 使用 React Router v7 createBrowserRouter
 * - 每个子路由通过 handle.meta.title 提供标题，配合 `useChangeTitle`
 * - 支持微前端环境的路由适配
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/types/routes'
import { lazy } from 'react'

// 扩展Window接口以支持无界微前端
declare global {
  interface Window {
    __POWERED_BY_WUJIE__?: boolean
    __WUJIE?: any
    $wujie?: any
  }
}

const Admin = lazy(() => import('@/pages/Admin'))
const DashBoard = lazy(() => import('@/pages/DashBoard/DashBoard'))
const BookingReview = lazy(() => import('@/pages/Venue/BookingReview'))
const Notice = lazy(() => import('@/pages/Venue/Notice')) 
const ForumManagement = lazy(() => import('@/pages/Forum/ForumManagement'))
const ForumDetail = lazy(() => import('@/pages/Forum/ForumDetail'))
const Products = lazy(() => import('@/pages/Shop/Products'))
const Orders = lazy(() => import('@/pages/Shop/Orders'))
const VenueManagement = lazy(() => import('@/pages/Venue/VenueManagement'))
const UserManagement = lazy(() => import('@/pages/User/UserManagement'))

/**
 * 获取基础路径
 * 在微前端环境中，路由由主应用管理，子应用不需要设置basename
 * 在独立运行时，使用默认的根路径
 */
const getBasePath = () => {
  // 检测是否在无界微前端环境中
  if (typeof window !== 'undefined') {
    const isWujieEnv = window.__POWERED_BY_WUJIE__ || 
                      window.__WUJIE || 
                      window.$wujie
    
    if (isWujieEnv) {
      console.log('🎯 [Router] 检测到微前端环境，使用空basename')
      return ''  // 微前端环境中，路由由主应用统一管理
    }
  }
  
  console.log('🏠 [Router] 独立运行模式，使用默认basename')
  return ''  // 独立运行时的基础路径
}

const router = createBrowserRouter([
    {
      path: '/',
      element: <Navigate to={ROUTES.ADMIN} replace />
    },
    {
      path: ROUTES.ADMIN,
      element: <Admin />,
      handle: {
        meta: {
          title: '首页',
        },
      },
      children: [
        {
          index: true,
          element: <DashBoard />,
          handle: {
            meta: {
              title: '首页',
            },
          },
        },
        {
          path: ROUTES.BOOKING_REVIEW,
          element: <BookingReview />,
          handle: {
            meta: {
              title: '预定管理',
            },
          },
        },
        {
          path: ROUTES.NOTICE,
          element: <Notice />,
          handle: {
            meta: {
              title: '发布通知',
            },
          },
        },
        {
          path: ROUTES.FORUM,
          element: <ForumManagement />, 
          handle: {
            meta: {
              title: '论坛管理',
            },
          },
        },
        {
          path: ROUTES.FORUM_POST,
          element: <ForumDetail />,
          handle: {
            meta: {
              title: '论坛详情',
            },
          },
        },
        {
          path: ROUTES.PRODUCTS,
          element: <Products />,
          handle: {
            meta: {
              title: '商品管理',
            },
          },
        },
        {
          path: ROUTES.ORDERS,
          element: <Orders />,
          handle: {
            meta: {
              title: '商品订单',
            },
          },
        },
        {
          path: ROUTES.VENUE_MANAGEMENT,
          element: <VenueManagement />,
          handle: {
            meta: {
              title: '场地管理',
            },
          },
        },
        {
          path: ROUTES.USER_MANAGEMENT,
          element: <UserManagement />,
          handle: {
            meta: {
              title: '用户管理',
            },
          },

        },
      ],
    }
], {
  basename: getBasePath()  // 根据环境动态设置基础路径
})

export default router;
