---
title: Code Splitting
pubDate: 2023-06-22
description: 本文将会介绍 WebPack 的分包策略，以及如何通过配置 SplitChunksPlugin 优化分包。
---

Webpack 为人所诟病的除了丰繁复杂的配置方式之外，就是蜗牛般的构建速度了。本文将会介绍默认的分包策略，以及如何优化分包策略提升性能。

## Entry 分包处理

入口文件 main.js。

```js
// main.js
import a from 'a.js'
import b from 'b.js'
```

Webpack 根据下面配置打包。

```js
// webpack.config.js
module.exports = {
  entry: {
    main: './src/main.js'
  }
}
```

启动 Webpack 时会以入口为起点，分析当前模块依赖的所有模块。每找到一个模块就使用相应 Loader 去转换。然后对所有依赖模块重复上述过程，最终所有依赖模块会被放入同一个 Chunk，通常称为 Initial Chunk 模块依赖关系如下图所示：

![](/images/2023/webpack-code-splitting/initial-chunk.svg)

值得一提的是，多 Entry 的场景下与之并无二致。

## 异步模块分包处理

webpack 提供了两种技术实现动态导入，第一种也是官方推荐选择的方式是 `import()` 另外一种则是 webpack 的遗留功能 `require.ensure`

```js
// main.js
import a from 'a.js'
import('async-b.js')

// async-b.js
import c from 'c.js'
```

在 main.js 中，以同步方式引入 a.js 以异步方式引入 async-b.js；在 async-b.js 中以同步方式引入 c.js 模块。 模块依赖关系如下图所示：

![](/images/2023/webpack-code-splitting/async-chunk.svg)

异步模块会被单独放入一个 Chunk 称之为 Async Chunk。

## Runtime 分包处理

如果你看过 Webpack 构建的产物，那你对下面的代码一定不会陌生：

```js
;(() => {
  'use strict'
  var __webpack_modules__ = {
    './src/man.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__
    ) => {
      eval(
        '__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   a: () => (/* binding */ a)\n/* harmony export */ });\nconst a = 0\n\n//# sourceURL=webpack://code_splite/./src/man.js?'
      )
    }
  }
  var __webpack_require__ = {}

  ;(() => {
    __webpack_require__.d = (exports, definition) => {
      for (var key in definition) {
        if (
          __webpack_require__.o(definition, key) &&
          !__webpack_require__.o(exports, key)
        ) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key]
          })
        }
      }
    }
  })()
  ;(() => {
    __webpack_require__.o = (obj, prop) =>
      Object.prototype.hasOwnProperty.call(obj, prop)
  })()
  ;(() => {
    __webpack_require__.r = (exports) => {
      if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
      }
      Object.defineProperty(exports, '__esModule', { value: true })
    }
  })()

  var __webpack_exports__ = {}
  __webpack_modules__['./src/man.js'](
    0,
    __webpack_exports__,
    __webpack_require__
  )
})()
```

Webpack 会在构建的产物注入代码来支持相关特性。例如：需要模块化就会注入`__webpack_require__.f`和 `__webpack_require__.r`，除了支持相关特性代码之外还包含用于优化持久化缓存的代码。

使用的特性越多注入的代码就会越多，默认情况下 Webpack 会为每个 Entry 注入代码。很显然大部分的运行时代码都是类似的。为每个 Entry 注入类似的代码显然是性能浪费。

为此 Webpack 5 专门提供了 entry.runtime 配置项用于声明如何打包运行时代码。用法上只需在 entry 项中增加字符串形式的 runtime 值，例如：

```js
module.exports = {
  entry: {
    main: { import: './src/main', runtime: 'runtime-chunk' }
  }
}
```

最终会产出两个 Chunk，运行时的 Chunk 称为 Runtime Chunk 。

在多 Entry 场景中，只要为每个 Entry 都设定相同的 runtime 值，webpack 运行时代码最终就会写入到同一个 Chunk 。

```js
module.exports = {
  entry: {
    main: { import: './src/main', runtime: 'runtime-chunk' },
    index: { import: './src/index', runtime: 'runtime-chunk' }
  }
}
```

## 默认分包的问题

Webpack 默认会将所有的模块打包成一个文件，随着项目的迭代会不可避免的暴露两个问题：

- 资源冗余：必须等待所有的资源处理完毕之后才能显示页面，但我们可能只需要其中的一部分。

- 缓存失效：将所有的资源构建成一个包后，即使修改一个字符，也会导致模块缓存失效。

另外多 entry 场景下，如果多个 Chunk 同时包含同一个模块那么这个模块会被重复打包。

比如我们有两个入口 main/index 同时依赖了同一个模块，模块依赖关系如下图所示：

![](/images/2023/webpack-code-splitting/multiple-entry.svg)

幸运的是，上述的问题都可以通过 SplitChunksPlugin 来得到解决。

## SplitChunksPlugin

默认情况下，SplitChunksPlugin 只会影响到按需加载的 Chunk 。我们可以通过 `splitChunks.chunks` 指定对哪些 Chunk 生效。

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      // include all types of chunks
      chunks: 'all'
    }
  }
}
```

- all：对 Initial Chunk 和 Async Chunk 都生效，建议优先使用该项。

- initial：只对 Initial Chunk 生效。

- async：只对 Async Chunk 生效。

- (chunk)=>boolean：该函数返回 `true` 时生效。

### 按体积分包

SplitChunksPlugin 会根据拆包前的体积决定是否拆包，这一规则的相关配置项如下：

- minSize：超过这个 minSize 的 Chunk 才会被拆分。
- maxSize：超过 maxSize 的 Chunk 才会被拆分，且拆分后的体积不能小于 minSize。
- maxAsyncSize：与 maxSize 功能相同，但只对异步模块生效。
- maxInitialSize：与 maxAsyncSize 类似，但只对入口模块生效。
- enforceSizeThreshold：强制执行拆分的体积阈值，其他限制将被忽略。

> 设置 maxSize 的值会同时设置 maxAsyncSize 和 maxInitialSize 的值。

### 按被引用频率分包

还可以按模块被引用的次数拆分，按照下面代码如果被引用次数小于等于 2 将不会被拆分。

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      chunks: 'all',
      minChunks: 2 // 被引用次数<=2的模块不进行分包
    }
  }
}
```

### 限制拆分数量

通过 maxInitialRequests / maxAsyncRequests 配置项限定分包数量。

- maxInitialRequests：入口点的最大并行请求数。
- maxAsyncRequests：按需加载时的最大并行请求数。

这里所说的“请求数”是指加载一个 Chunk 时所需同步加载的分包数。例如：对于一个 Chunk A，如果根据分包规则分离出了若干子包，那么请求 A 时，浏览器需要同时请求所有的子包，此时并行请求数等于分包数加主包数。

```js
// mian.js
import a from 'a.js'
import b from 'b.js'

// index.js
import a from 'a.js'
import b from 'b.js'

// webpack.config.js
module.exports = {
  entry: {
    index: './src/index.js',
    main: './src/main.js'
  }
}
```

对于上面代码，若 minChunks = 2，则 a.js、b.js 将会分别被打包。浏览器请求 main.js 时需要同时请求 a.js、b.js 两个子包，并行数为 2 + 1 = 3，此时若 maxInitialRequests = 2 ，则分并行数超过阈值，SplitChunksPlugin 会放弃 a.js、b.js 中体积较小的分包。maxAsyncRequests 逻辑与此类似。

> 并行请求数：
>
> - Initial Chunk 本身算一个请求
> - Async Chunk 不算并行请求
> - 通过 runtime 拆分出的 Runtime Chunk 不算并行请求
> - 如果同时有两个 Chunk 满足拆分规则，但是 maxInitialRequests（或 maxAsyncRequestss）的值只能允许再拆分一个模块，那么体积更大的模块会被优先拆解

到这里会发现有多个属性会影响分包策略，它们之间的优先级如下：

- maxInitialRequests/maxAsyncSize < maxSize < minSize ，命中 enforceSizeThreshold 阈值的 Chunk 会直接跳过这些属性判断，强制进行分包。

### 缓存组

除上述规则外，SplitChunksPlugin 还提供了 cacheGroups 对不同的文件配置拆分规则。例如：

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          filename: "js/[id]"
          minChunks: 1,
          minSize: 0，
          priority:10
        }
      }
    }
  }
}
```

通过 cacheGroups 属性设置 vendors 缓存组，所有 vendors.test 规则匹配的模块都会被视作 vendors 分组，优先应用该组下的分包配置。

- test：接受正则表达式、函数及字符串，所有符合 test 判断的 Module 或 Chunk 都会被分到该组

- filename：文件名，支持占位符。

- priority：一个模块可以同时属于多个分组，该选项用于设置该分组的优先级。

### 默认分组

WebPack 提供了两个开箱即用的 cacheGroups ，分别命名为 default 与 defaultVendors，下面是 SplitChunksPlugin 的默认配置：

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
}
```

也可以将默认分组设置为 false，关闭分组配置。

```js
module.exports = {
  //...
  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false
      }
    }
  }
}
```

### Runtime 拆包

关于运行时代码前面已经介绍过了这里就不再赘述了。除了上述方式之外，还可以通过以下方式将运行时代码拆分到一个独立的 Chunk：

```js
module.exports = {
  //...
  optimization: {
    runtimeChunk: true
  }
}
```

## 总结

Chunk 是输出产物的基本组织单位，默认情况下同一个 Entry 下的模块组织成一个 Chunk，异步模块单独组织为一个 Chunk，而 Entry 的 runtime 则单独组织成一个 Chunk。

默认的分包策略在单入口情况下存在**资源冗余**、**缓存失效**等问题，而多入口场景下又有重复打包的问题。为了解决这些问题，WebPack 提供了 SplitChunksPlugin 来优化分包策略。可以根据模块使用频率、分包数量和分包体积等参数来进行分包优化。

总而言之合理配置 SplitChunksPlugin 可以大大提升性能和用户体验。
