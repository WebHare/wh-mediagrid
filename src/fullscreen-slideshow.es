///////////////////////////////////////////////////////////////////////////////////
//
//  Fullscreen slideshow
//

import Browser from "@webhare-system/compat/browser";
import * as dompack from "dompack";
import Carrousel from "dompack-carrousel";

import "./fullscreen.css";
import "./fullscreen-buttons.css";


let __active_photoviewer = null;
let __active_fsslideshow_container = null;
let __old_scrolly = 0;
let __initialized = false;

function refreshFullScreenSlideshow(viewer)
{
  if (viewer.node.clientHeight == 0)
    return;

  resizeImagesToFitInViewport(viewer.node);

  var options = getDefaultSlideshowOptions();
  //console.log("Slideshow options", options);

  viewer.setOptions(options);
  viewer.relayoutSlides();
  viewer.refresh();
}


function resizeActivePhotoviewer()
{
  if (!__active_fsslideshow_container)
    return;

  if (__active_photoviewer)
  {
    console.log("update active photoviewer");
    refreshFullScreenSlideshow(__active_photoviewer);
  }
  else
  {
    resizeImagesToFitInViewport(__active_fsslideshow_container);
  }
}

function doActivateSlideshowByHash(hash)
{
  // we only use the ID part, since we assume the title may change more often than the (whfs/whfssetting)id of an image
  // (people add titles after first publication of the page, they correct spelling errors)
  var parts = hash.split("-");
  var imageid = parts[0]; // assume ID-title

  console.info("doActivateSlideshowByHash", hash);

  // for items with <id>-title make sure to have - at the end so for example 1337 won't be a match when imageid is 133
  var cell = document.querySelector('.carrousel__cell[data-hash^="' + imageid + '-"]');

  // for items with no title we only have <id>
  if (!cell)
    cell = document.querySelector('.carrousel__cell[data-hash="' + imageid + '"]');

  console.info('.carrousel__cell[data-hash="' + imageid + ']');

  if (!cell)
    return;

  // find the first slideshow which has this hash
  var slideshow = dompack.closest(cell, ".photoalbumwidget__slideshow");

  // lookup the index of the image we have to show
  var all_items = slideshow.querySelectorAll(".carrousel__cell");
  var itemidx = Array.from(all_items).indexOf(cell);

  ___doActivateSlideshow(slideshow, itemidx);
}

function doActivateSlideshow(instanceid, itemidx)
{
  var containerid = instanceid+"-slideshow";
  var slideshowcontainer = document.getElementById(containerid);
  if (!slideshowcontainer)
  {
    console.error("Cannot find slideshow container ", containerid);
    return;
  }

  ___doActivateSlideshow(slideshowcontainer, itemidx)
}

function ___doActivateSlideshow(slideshowcontainer, itemidx)
{
  let use_carrousel = slideshowcontainer.hasAttribute("data-carrousel-options");

  if (!__initialized)
  {
    window.addEventListener("resize", resizeActivePhotoviewer);
    __initialized = true;
  }

  __old_scrolly = document.body.scrollTop || document.documentElement.scrollTop;


  // Remove the 'download' button for iOS, since it won't allow us to download images through a link anyway
  if (Browser.platform == "ios")
  {
    var downloadbutton = slideshowcontainer.querySelector(".fsslideshow__download");
    if (downloadbutton)
      downloadbutton.style.display = "none";
  }

  document.body.appendChild(slideshowcontainer);

  var carrouselcontainer = slideshowcontainer; //.querySelector(".carrousel");
  carrouselcontainer.addEventListener("wh:activeslidechange", onActiveSlideChange);
  carrouselcontainer.addEventListener("wh:closeslideshow", doCloseFullscreenSlideshow);

  // FULLSCREEN
  slideshowcontainer.classList.add("html__fullscreenelement");
  document.documentElement.classList.add("html--onlyfullscreenelement");

  //console.info("Fullscreen carrousel", options);

  var options = getDefaultSlideshowOptions();
  resizeImagesToFitInViewport(carrouselcontainer); //carr.node);

  //console.log("Slideshow options", options);

  slideshowcontainer.classList.add("prepare"); // measure + pre-animation phase

  var carr = carrouselcontainer.__carrousel;

  //if (carr.node.clientHeight == 0)
  if (carrouselcontainer.clientHeight == 0)
    console.error("Failed to resize fullscreen slideshow.");



  if (use_carrousel)
  {
    if (!carr)
    {
      options.initialslide = itemidx;

      carr = new Carrousel(carrouselcontainer, options);

      // The carrousel must handle the click/taps!!
      carr.node.addEventListener("tap", detectButtonTaps);

      carrouselcontainer.__carrousel = carr;
    }
    else
    {
      carr.setOptions(options);
      carr.relayoutSlides();
      carr.jumpToSlide(itemidx);
    }

    carr.drawFrame(); // be sure to have the first frame ready before settings 'visible'
  }
  else
  {
    slideshowcontainer.addEventListener("click", detectButtonTaps);

    // allow loading of the image
    let slidenodes = slideshowcontainer.querySelectorAll(".carrousel__cell-image");
    for(let node of slidenodes)
      node.style.backgroundImage = "";
  }

  document.clientWidth; // Force reflow so the .visible will trigger an transition

  slideshowcontainer.classList.add("visible");

  if (use_carrousel)
  {
    // Set focus for keyboard navigation
    carr.nodes.viewport.focus(); // FIXME: private node info
  }

  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;

  if (use_carrousel)
    __active_photoviewer = carrouselcontainer.__carrousel;

  __active_fsslideshow_container = slideshowcontainer;
}

function doCloseFullscreenSlideshow()
{
  var fsscontainer = __active_fsslideshow_container;
  fsscontainer.classList.remove("prepare");
  fsscontainer.classList.remove("active");

  // Exit FULLSCREEN
  fsscontainer.classList.remove("html__fullscreenelement");
  document.documentElement.classList.remove("html--onlyfullscreenelement");

  // WS2016 specific
  var headeranim = document.querySelector(".header__universe");
  if (headeranim)
    headeranim.style.display = "block";

  window.scrollTo(0, __old_scrolly);

  __active_photoviewer = null;
  __active_fsslideshow_container = null;

  history.replaceState(undefined, undefined, ".");
}

function detectButtonTaps(evt)
{
  var buttonnode = dompack.closest(evt.target, ".fsslideshow__button");
  if (!buttonnode)
    return;

  if (buttonnode.classList.contains("fsslideshow__close"))
    doCloseFullscreenSlideshow();
}

function onActiveSlideChange(evt)
{
  //console.info(evt.detail);

  var slideshowcontainer = dompack.closest(evt.target, ".fsslideshow");
  var titlenode = slideshowcontainer.querySelector(".fsslideshow__title");
  var downloadbutton = slideshowcontainer.querySelector(".fsslideshow__download");

  var carrousel = slideshowcontainer.querySelector(".carrousel").__carrousel;
  var slidenode = evt.detail.nextactivenode;

  // FIXME: carrousel.items.length ... is this evil or allowed?
  titlenode.textContent = (evt.detail.nextactiveidx+1) + "/" + evt.detail.carrousel.items.length + " " + evt.detail.nextactivenode.getAttribute("data-title");

  if (downloadbutton)
  {
    downloadbutton.href = slidenode.getAttribute("data-download");
    downloadbutton.setAttribute("download", slidenode.getAttribute("data-filename"));
  }

  var urlhash = slidenode.getAttribute("data-hash");
  history.replaceState(undefined, undefined, "#fsviewer-" + urlhash);
}

function getDefaultSlideshowOptions()
{
  var de_height = document.documentElement.clientHeight;
  var b_height = document.body.clientHeight;
  var viewport_width = document.body.clientWidth;
  var viewport_height = de_height > b_height ? de_height : b_height;

  return { activeslidealignment: "middle"
         , vertical_align:       "middle"
         , gap:                  viewport_width / 20
         , slidewidth:           viewport_width //* 0.75

         , height:               viewport_height // center within the full height (if we use auto height the box-shadow get's cut off by overflow: hidden;)

         , autodraw_firstframe:  false

         // because we are fullscreen we don't need to worry about blocking vertical dragging
         // of the page on touch devices. We rather prevent dragging causing selections(with mouse)
         // or unintentionally scrolling the background.
         , eventPassthrough:     false
         };
}

function resizeImagesToFitInViewport(carrouselcontainer)
{
  var de_height = document.documentElement.clientHeight;
  var b_height = document.body.clientHeight;
  var viewport_width = document.body.clientWidth;
  var viewport_height = de_height > b_height ? de_height : b_height;

  var maximagewidth = viewport_width * 0.75;
  var maximageheight = viewport_height - 130;

   var dpr = window.devicePixelRatio;
   if (!dpr)
      dpr = 1; // fallback for IE10


console.log(viewport_width + " x " + viewport_height);

  var images = carrouselcontainer.querySelectorAll(".carrousel__cell-image");
  //for (var idx = 0; idx < carrouselcontainer.__carrousel.items.length; idx++)
  for (var idx = 0; idx < images.length; idx++)
  {
    var image = images[idx];

    var orig_w = parseInt(image.getAttribute("data-width"));
    var orig_h = parseInt(image.getAttribute("data-height"));

    var max_w_stretch = maximagewidth / orig_w;
    var max_h_stretch = maximageheight / orig_h;
    var stretch = max_w_stretch < max_h_stretch ? max_w_stretch : max_h_stretch;

    var img_w = Math.round(orig_w * stretch * dpr) / dpr;
    var img_h = Math.round(orig_h * stretch * dpr) / dpr;

    //console.log(image, orig_w+"x"+orig_h, img_w+"x"+img_h);

    image.style.width = img_w + "px";
    image.style.height = img_h + "px";
  }
}



dompack.register(".fsslideshow", (node, idx) =>
{
  if (idx != 0)
    return;

  var hash = window.location.hash;

  if (hash != "")
    hash = hash.substr(1)

  if (hash.substr(0,9) == "fsviewer-")
  {
    doActivateSlideshowByHash(hash.substr(9));
  }
});


module.exports = { doActivateSlideshow: doActivateSlideshow };
