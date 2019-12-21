// ==UserScript==
// @name        New script - bilibili.com
// @namespace   Violentmonkey Scripts
// @grant       none
// @version     1.0
// @author      -
// @description 2019/12/21 下午5:21:34
// ==/UserScript==

function executeMainFunction(){
	if(location.hostname.indexOf('bilibili.com') === -1) return
		main()
}

executeMainFunction()

function main (){
	function setStyles(target,styles){
		Object.keys(styles).forEach((styleName)=>{
			target.style[styleName] = styles[styleName]
		})
	}
	var node
	function createMark(){
		node = document.createElement('div')
		font = document.createElement('p')
		node.appendChild(font)
		font.innerText = '正在清理页面'
		setStyles(node,{
			width:'100%',
			height:'100%',
			background:'#fff',
			position:'fixed',
			display:'flex',
			alignItems:'center',
			justifyContent:'center',
			fontSize:'14px',
			zIndex:'99999',
			top:'0',
			left:'0'
		})
		setStyles(font,{
			textAlign:'center',
		})
		document.body.appendChild(node)
	}
	function clearMark(){
		if(document.body.hasChildNodes(node)){
			setStyles(node,{
				width:'0',
				height:'0',
				display:'none',
				background:''
			})
		}
	}

	function DOMControl(){
		this.dom = window ? window.document : {}
	}

	DOMControl.prototype={
		selectIdNode:function(idName,target){
			return target.querySelector(idName)
		},
		selectAllClassNode:function(className,target){
			var classNames = className.split('.').filter((item)=>{
				if(item === '.'){
					return false
				}
				if(item === ''){
					return false
				}
				return true
			})
			var elements = target.getElementsByClassName(classNames[0])
			var targetElements = []
			for (var element of elements) {
				var itemClassNames = element.className.split(' ')
				var isTargetElement =  classNames.every((eClassName)=>{
					if(itemClassNames.includes(eClassName)) return true
				})
				if(isTargetElement){
					targetElements.push(element)
				}
			}
			return targetElements
		},
		selectAllTagNameNode:function(tagName,target){
			return target.getElementTagName(tagName)
		},
		$:function(selectName,target){
			target = target || window.document

			if(typeof selectName === 'string'){
				selectName = selectName.trim()
			}else{
				return selectName
			}
			
			if(selectName == null || selectName === ''){
				return
			}

			if(selectName.indexOf('.') === 0){

				return this.selectAllClassNode(selectName,target)
			}

			if(selectName.indexOf('#') === 0){
				return this.selectIdNode(selectName,target)
			}

			return this.selectAllTagNameNode(selectName,target)
		},
		removeNode:function(element,callback){
			element =this.$(element)

			if(!element){
				return
			}
			
			if(Array.isArray(element)){
				if(element.length === 0){
					return
				}
				this.removeNodes(element)
				return
			}
			if(callback && callback.functionDidGetNode){
				callback.functionDidGetNode(element)
			}
			
			var parent = element.parentElement
			if(!parent){
				return
			}

			parent.removeChild(element)
			if(callback && callback.functionDidRemoveNode){
				callback.functionDidRemoveNode(parent)
			}
		},
		removeNodes:function(elements){
			for (var element of elements) {
				this.removeNode(element)
			}
		}
	}

	function Ban(){
		this.location = location
		this.pageType = ['index','video','live','bangumi']
		this.DOMControl = new DOMControl()
	}

	Ban.prototype.getPageType= function(){
		var pathname = this.location.pathname
		var hostname = this.location.hostname
		if(hostname === 'live.bilibili.com'){
			return 'live'
		}
		if(hostname === 'space.bilibili.com'){
			return 'space'
		}
		if(hostname === 'www.bilibili.com'){
			if(pathname === '' || pathname === '/'){
				return 'index'
			}
			var type = this.location.pathname.split('/')[1]
			return type
		}
		return 'unknown'
	}

	Ban.prototype.timerExecution = function(options){
		var timeoutNum = 0
		var condition
		var auto = typeof options.auto === undefined ? true : options.auto
		var interval = setInterval(function(){
			timeoutNum++

			if(auto){
				if(timeoutNum === (options.maxTimeout || 100)){
					clearInterval(interval)
				}
			}
			
			condition =typeof options.condition === 'function' ? options.condition(timeoutNum) : options.condition

			if(condition){
				options.mount(interval)
				if(auto){
					clearInterval(interval)
				}
			}
		},options.delay || 2000)
	}

	Ban.prototype.removeNodesAsync = function(elements){
		elements.forEach((element)=>{
			this.timerExecution({
				auto:false,
				delay:1000,
				maxTimeout:100,
				mount:(timer)=>{
					this.removeNodesOnce(element)
					clearMark()
				},
				condition:(timeoutNum)=>{
					var hasNode = false
					this.DOMControl.removeNode(element,{
						functionDidGetNode:(node)=>{
							hasNode = true
						},
						functionDidRemoveNode:(parent)=>{}
					})
					return hasNode
				},
			})
		})
	}

	Ban.prototype.removeNodesOnce = function(elements){
		if(!Array.isArray(elements)){
			elements = [elements]
		}
		elements.forEach((element)=>{
			this.timerExecution({
				auto:true,
				delay:1000,
				maxTimeout:100,
				mount:(timer)=>{
					this.DOMControl.removeNode(element)
					clearMark()
				},
				condition:(timeoutNum)=>{
					var hasNode = false
					this.DOMControl.removeNode(element,{
						functionDidGetNode:(node)=>{
							hasNode = true
						},
						functionDidRemoveNode:(parent)=>{}
					})
					return hasNode
				},
			})
		})
	}

	Ban.prototype.start = function (options){
		var pageType = this.getPageType()
		createMark()
		if(options.index && pageType === 'index'){
			this.index()
		}
		if(options.video && pageType === 'video'){
			this.video()
		}
		if(options.space && pageType === 'space'){
			this.space()
		}
	}

	Ban.prototype.space = function(){
		this.removeNodesOnce([
			'#bili-header-m',
			'.n-statistics',
			'.be-dropdown.h-version'
			])
		this.removeNodesAsync([
			'#page-index',
			])
	}

	Ban.prototype.video = function(){
		this.removeNodesOnce([
			'.r-con',
			'.bilibili-player-video-info',
			'.bilibili-player-video-top-follow.bilibili-player-show',
			'#entryOld',
			'#arc_toolbar_report',
			'#v_desc',
			'#v_tag',
			'#bili-header-m'
			])
		
		this.removeNodesAsync([
			'#activity_vote',
			'#comment',
			])
	}

	Ban.prototype.index = function(){
		this.removeNodesOnce([
			'#internationalHeader',
			'.first-screen.b-wrap',
			'#elevator',
			'.international-footer',
			])

		this.removeNodesAsync([
			'#bili_read',
			'#bili_live',
			'#bili_douga',
			'#bili_guochuang',
			'#bili_report_spe_rec',
			'#bili_movie',
			'#bili_cinephile',
			'#bili_digital',
			'#bili_teleplay',
			'#bili_ad',
			'#bili_life',
			'#bili_dance',
			'#bili_music',
			'#bili_manga',
			'#bili_fashion',
			'#bili_ent'
			])
	}

	var ban = new Ban()
	ban.start({
		index:true,
		video:true,
		space:true,
		bangumi:true,
	})
}