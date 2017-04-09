import * as dompack from "dompack";
import * as fsslideshow from "./fullscreen-slideshow.es";
import { JustifiedImageGrid } from "dompack-justifiedcontentgrid"; //FIXME must delcare as dependency

import Browser from "@webhare-system/compat/browser"; //FIXME use dompack browser


//import "../../../shared/hoversupport";
import "./mediagrid.css";


let __photoalbum_grids = [];



///////////////////////////////////////////////////////////////////////////////////
//
//  Photoalbum overview (justified image grid)
//

function refreshAllPhotoAlbums()
{
  for (let grid of __photoalbum_grids)
  {
    var defaultoptions = getDefaultGridOptions(grid.container); // FIXME: is 'container' public?
    grid.setOptions(defaultoptions);
    grid.refresh();
  }
}

function doCheckForImageSelection(evt)
{
  var item = dompack.closest(evt.target, ".photoalbumwidget__item");
  if (!item)
    return;

  //console.log("Item", item);

  var grid = dompack.closest(evt.target, ".photoalbumwidget");
  var instanceid = grid.getAttribute("data-instanceid");
  //console.log("Grid", grid);

  var items = grid.querySelectorAll(".photoalbumwidget__item");
  //items = Array.prototype.slice.call(items); // convert [Object] to [Array]
  items = Array.from(items);
  //console.log("All items", items);

  //console.log(typeof items);

  var itemidx = items.indexOf(item);
  if (itemidx == -1)
    return;

  //console.log("Opening carrousel slideshow at #"+itemidx);

  var headeranim = document.querySelector(".header__universe");
  if (headeranim)
    headeranim.style.display = "none";

  fsslideshow.doActivateSlideshow(instanceid, itemidx);
}

function getDefaultGridOptions(node)
{
  //console.log("getDefaultGridOptions", node);
  var dpr = window.devicePixelRatio;
  if (!dpr)
     dpr = 1; // fallback for IE10

  var contentWidth = node.clientWidth;

  // WARNING: setting the row_height higher may cause some rows not to fit two images,
  //          blowing up a single image to fill a row (which looks blurry)
  var defaultoptions =
            { width:      Math.round(contentWidth * dpr) / dpr
            , row_height: Math.round(contentWidth / 2.75 * dpr) / dpr
            , gutter_x:   Math.round(contentWidth * dpr / 50) / dpr
            , gutter_y:   Math.round(contentWidth * dpr / 50) / dpr
            };

  return defaultoptions;
}

let didHoverRegister;

export function setupMediaGrid(selector)
{
  dompack.register(selector, (node, idx) =>
  {
    var gridnode = node.querySelector(".justifiedmediagrid");

    var defaultoptions = getDefaultGridOptions(gridnode);
    var grid = new JustifiedImageGrid(
                    gridnode
                  , defaultoptions
                  );

    __photoalbum_grids.push(grid);

    grid.refresh();

    gridnode.addEventListener("click", doCheckForImageSelection);

    if (!didHoverRegister)
    {
      // FIXME: nicer classname?
      let ios = Browser.platform == "ios";
      document.documentElement.classList.add(ios ? "nohover" : "allowhover");

      window.addEventListener("resize", refreshAllPhotoAlbums);
      didHoverRegister=true;
    }
  }, {afterdomready:true});
}
