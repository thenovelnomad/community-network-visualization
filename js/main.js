var Network = function() {
  //initialize graph constants, variables accessed by all functions
  var main, svg;
  var width = window.innerWidth < 845 ? window.innerWidth : window.innerWidth*0.8;//960; //initialize resize function
  width = width > 990 ? 990 : width;
  var height = width*(3/4) > 400 ? width*(3/4) : width*(4/3);
  var detailsModal = jQuery('#myModal').modal({"backdrop": true, "show": false});
  var hoverScale = d3.scale.linear().domain([400,1000]).range([4, 3]);
  var radialScale = d3.scale.linear().domain([400,1000]).range([8,15]);
  var gravScale = d3.scale.linear().domain([400,1000]).range([0.4, 0.2]);
  var linkScale = d3.scale.linear().domain([400,1000]).range([3, 7]);
  var chargeScale = d3.scale.linear().domain([400,1000]).range([-2, -1]);

  //data variables
  var allData = [];
  var curLinksData = [];
  var curNodesData = [];
  var linkedByIndex = {};
  var skillsMap = {};
  var skillsArr = [];

  var nodesG = null;
  var linksG = null;

  var node = null;
  var link = null;

  //viz variables
  var circleRadius = radialScale(width);

  var linkDistance = circleRadius * linkScale(width);
  var layout = "force";
  var filter = {
    "search": null,
    "type": null,
    "skill": null,
    "selection": null
  };
  var force = d3.layout.force()
    .gravity(gravScale(width))
    .size([width, height]);

  // initialize private functions
  var skillsSetup = function() {
      LocationService.tag_options({location_id: $scope.locationId}, function(data) {
        if (data.skills.children) {
          var skillsArr = []
          for (var i in data.skills.children) {
            skillsArr.push(data.skills.children[i]);
          }
          var orderBy = $filter('orderBy');
          $scope.skills = orderBy(skillsArr, 'name');

          skillsMap = d3.map();
          for(var i in $scope.skills) {
            var element = $scope.skills[i];
            skillsMap.set(element.value, element.name);
          }
        }
      }, function(response) {
        console.error("There was an error retrieving tag options for this locaation.");
        console.log(response);
      });
  }();

  var mapNodes = function(nodes) {
    var nodesMap = d3.map();
    nodes.forEach(function(n) {
      nodesMap.set(n.id, n);
    });
    return nodesMap;
  };

  var neighboring = function(a, b) {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
  };

  var graphSize = function(data) {
    width = window.innerWidth < 845 ? window.innerWidth : window.innerWidth*0.8;
    width = width > 990 ? 990 : width;
    height = width*(3/4) > 400 ? width*(3/4) : width*(4/3);
    main.select("svg")
      .attr("width", width)
      .attr("height", height);

    circleRadius = radialScale(width);

    linkDistance = circleRadius * linkScale(width);
    force.linkDistance(linkDistance)
      .charge(chargeScale(width)*linkDistance)
      .size([width, height]);
  }

  var setupData = function(data) {
    svg = main.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g");
      // .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
      // .append("g");

    graphSize(data);

    // function zoom() {
    //   console.log("Zoom");
    //   svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    // };

    // svg.append("rect")
    //     .attr("class", "overlay")
    //     .attr("width", width)
    //     .attr("height", height);

    data.nodes.forEach(function(element) {
      var scale = Math.sqrt(element.scale/Math.PI);
      element.radius = scale*circleRadius;
    });

    // id's -> node objects
    var nodesMap = mapNodes(data.nodes);

    // switch links to point to node objects instead of id's
    data.links.forEach(function(l, index, array) {
      if (nodesMap.has(l.source) && nodesMap.has(l.target)){
        l.source = nodesMap.get(l.source);
        l.target = nodesMap.get(l.target);

        // linkedByIndex is used for link sorting
        linkedByIndex[l.source.id + "," + l.target.id] = 1;
      } else {
        array.splice(index, 1);
      }
    });

    return data;
  };

  var setFilter = function(newFilter) {
    filter[newFilter.type] = newFilter.key;
  };

  var searchFilter = function(nodes, key) {};
  var typeFilter = function(nodes, key) {
    return nodes.filter(function(d, i) {
      return d.type == key;
    });
  };
  var skillsFilter = function(nodes, key) {
    return nodes.filter(function(d, i) {
      return key.every(function(elem) {
        if (d.skills) { return d.skills.indexOf(elem) > -1; }
      });
    });
  };
  var selectionFilter = function(nodes, key) {
    return nodes.filter(function(d, i) {
      return neighboring(d, key) || d == key;
    });
  };

  var filterNodes = function(allNodes) {
    var filteredNodes = allNodes;
    if (filter.search || filter.type || filter.skill || filter.selection) {
      // filteredNodes = filter.search ? searchNodes(filteredNodes) : filteredNodes;
      filteredNodes = filter.type ? typeFilter(filteredNodes, filter.type) : filteredNodes;
      filteredNodes = filter.skill ? skillsFilter(filteredNodes, filter.skill) : filteredNodes;
      filteredNodes = filter.selection ? selectionFilter(filteredNodes, filter.selection) : filteredNodes;
    }
    return filteredNodes;
  };

  var filterLinks = function(allLinks, curNodes) {
    var curNodes = mapNodes(curNodes);
    var filteredLinks = allLinks.filter(function(l) {
      return curNodes.get(l.source.id) && curNodes.get(l.target.id);
    });
    return filteredLinks;
  };

  var updateNodes = function() {
    node = nodesG.selectAll("g.node")
      .data(curNodesData, function(d) { return d.id; });

    var newNodes = node.enter().append("g")
      .attr("class", "node")
      .attr("id", function(d) { return d.id; })
      .call(force.drag);

    newNodes.append("circle")
      .attr("r", function(d) { return d.radius + 1; })
      .attr("class", function(d) { return d.type + " bg"; });

    newNodes.append("clipPath")
      .attr("id", function (d) { return d.id + "-clip"})
      .append("circle")
      .attr("r", function(d) { return d.radius; })
      .attr("class", "clip");

    newNodes.append("image")
      .attr("clip-path", function(d) {
        return "url(#" + d.id + "-clip)";
      })
      .attr("xlink:href", function(d) {
        if (d.thumbnail) {
          return d.thumbnail;
        }
      })
      .attr("x", function(d) { return -1*d.radius; })
      .attr("y", function(d) { return -1*d.radius; })
      .attr("width", function(d) { return 2*d.radius; })
      .attr("height", function(d) { return 2*d.radius; });

    newNodes.append("text")
      .attr("class", "hide")
      .attr("text-anchor", "middle")
      .attr("dx", 0)
      .attr("dy", function(d) { return d.radius + 25; })
      .text(function(d) { return d.name; });

    node.on("mouseover", hoverOn)
        .on("mouseout", hoverOff);

    node.on("click", function(d, i) {
      // ignore drag
      if (d3.event.defaultPrevented) {
        return;
      }
      var self = d3.select(this);
      showDetails(d, i, self);
    });

    detailsModal.on("hide.bs.modal", function() {
      allData.nodes.forEach(function(d) { d.fixed = false; });
      force.resume();
      hideDetails(true);
    });

    node.exit().remove();
  };

  var updateLinks = function() {
    link = linksG.selectAll(".link")
      .data(curLinksData, function(d) { return d.source.id + "_" + d.target.id; });
    link.enter().append("line")
      .attr("class", "link")
      .attr("stroke", "black")
      .attr("stroke-opacity", 1.0);

    link.exit().remove();
  }

  var update = function() {
    curNodesData = filterNodes(allData.nodes);
    curLinksData = filterLinks(allData.links, curNodesData);

    curNodesData.forEach(function(element) {
      var scale = Math.sqrt(element.scale/Math.PI);
      element.radius = scale*circleRadius;
    })

    force.nodes(curNodesData)
      .links(curLinksData)
      .start();

    updateNodes();
    updateLinks();

    force.on("tick", function() {
        node.attr("cx", function(d) { return d.x = Math.max(circleRadius*2, Math.min(width - circleRadius*2, d.x)); })
          .attr("cy", function(d) { return d.y = Math.max(circleRadius*2, Math.min(height - circleRadius*4, d.y)); });
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; });
      });
  };

  var hoverOn = function(d, i){
    var self = d3.select(this);
    var mul = hoverScale(width)*10;

    node.sort(function (a, b) { // select the parent and sort the path's
      if (a.id != d.id) return -1;               // a is not the hovered element, send "a" to the back
      else return 1;                             // a is the hovered element, bring "a" to the front
    });

    var neighbors = selectionFilter(node, d);
    var non = node.filter(function(n) {
      return !neighboring(d, n) && n !== d;
    });
    var nbLinks = link.filter(function(l) { return l.source == d || l.target == d; });
    var nonLinks = link.filter(function(l) { return l.source != d && l.target != d; });

    self.select("circle.clip")
      .attr("r", function(d) { return mul; });

    self.select("circle.bg")
      .attr("r", function(d) { return mul + 2; });

    self.select("image")
      .attr("x", function(d) { return -mul; })
      .attr("y", function(d) { return -mul; })
      .attr("width", function(d) { return 2*mul; })
      .attr("height", function(d) { return 2*mul; });

    self.select("text")
      .attr("dy", function(d) { return 1.6*mul; });

    self.select("text").classed("hide", false);

    neighbors.classed("focus", true);
    nbLinks.classed("focus", true);
    non.classed("unfocus", true);
    nonLinks.classed("unfocus", true);

  };

  var hoverOff = function(d, i){
    var self = d3.select(this);

    self.select("circle.clip")
      .attr("r", function(d) { return d.radius; });

    self.select("circle.bg")
      .attr("r", function(d) { return d.radius + 1; });

    var neighbors = selectionFilter(node, d);
    var non = node.filter(function(n) {
      return !neighboring(d, n);
    });
    var nbLinks = link.filter(function(l) { return l.source == d || l.target == d; });
    var nonLinks = link.filter(function(l) { return l.source != d && l.target != d; });

    neighbors.classed("focus", false);
    nbLinks.classed("focus", false);
    non.classed("unfocus", false);
    nonLinks.classed("unfocus", false);

    self.select("image")
      .attr("x", function(d) { return -1*d.radius; })
      .attr("y", function(d) { return -1*d.radius; })
      .attr("width", function(d) { return 2*d.radius; })
      .attr("height", function(d) { return 2*d.radius; });
    self.select("text")
      .attr("dy", function(d) { return d.radius + 15; });

    self.select("text").classed("hide", true);
  };

  var showDetails = function(d, i, self) {
    if (d.type == "spn") {
      window.open(d.url, "_blank");
      return;
    }
    if (d.type == "100") {
      return;
    }
    network.toggleFilter({type: "selection", key: d});

    allData.nodes.forEach(function(d) { d.fixed = false; });
    d.fixed = true;
    d.px = d.x = width/2;
    d.py = d.y = height/6;
    force.resume();

    hideDetails();

    var offset = jQuery("#data-viz>svg").offset();
    window.scroll( 0, offset.top );

    var myModal = d3.select("#myModal");
    var label = myModal.select("#myModalLabel");
    var skills = myModal.select("#skills");
    var links = myModal.select("#links");
    var linkArr = [];

    links.select("strong")
      .text(function() {
        switch(d.type){
          case "mem":
            return "Projects";
          case "prj":
            return "Members";
          case "100":
            return "Sponsors";
          default:
            return "";
        }
      });

    if (d.url) {
      var link = label.select("a")[0][0] ? label.select("a") : label.append("a");
      link
        .attr("href", d.url)
        .attr("target", "_blank")
        .text(d.name);
    } else {
      label
        .text(d.name);
    }

    if (d.image) {
      myModal.select("img")
        .attr("src", d.image);
      myModal.select("#modal-image").classed("hide", false);
    } else {
      myModal.select("img")
        .attr("src", "/img/avatar.png");
      myModal.select("#modal-image").classed("hide", false);
    }

    myModal.select("#about").select("p")
      .html(d.desc);

    if (d.tagline) {
      myModal.select("#tagline")
        .select("strong")
        .html(d.tagline);
      myModal.select("#tagline")
        .classed("hide", false);
    }

    if (d.skills){
      if (d.skills.length > 0) {
        var skill_link = skills.select("ul").selectAll("li")
          .data(d.skills).enter()
          .append("li")
        skill_link
          .append("span")
          .text(function(d) {
            return skillsMap.get(d);
          })
          .classed("badge", true);

        skills.classed("hide", false);
      }
    }

    if (d.type != "spn") {
      allData.nodes.forEach(function(element, index, array) {
        if (neighboring(d, element)) {
          linkArr.push(element);
        }
      });

      if (linkArr.length > 0) {
        links.select("ul").selectAll("li")
          .data(linkArr).enter()
          .append("li").append("a")
          .attr("href", function (d) {
            return d.url;
          })
          .attr("target", "_blank")
          .text(function(d) { return d.name; });

        links.classed("hide", false);
      }
    }

    detailsModal.modal('show');
    // hoverOn(d, i);
  };

  var hideDetails = function(clear) {
    if (clear){
      network.toggleFilter({type: "selection", key: null});
    }

    var myModal = d3.select("#myModal");
    var skills = myModal.select("#skills");
    var links = myModal.select("#links");

    myModal.select("img").attr("src", "");
    myModal.select("#modal-image").classed("hide", true);
    myModal.select("#modal-info").classed("col-md-9", false);

    myModal.select("#myModalLabel")
      .text("")
      .select("a").remove();

    myModal.select("#about").select("p")
      .html("");

    myModal.select("#tagline")
      .select("strong")
      .html("");
    myModal.select("#tagline")
      .classed("hide", true);

    skills.select("ul").selectAll("li").remove();
    skills.classed("hide", true);
    links.select("ul").selectAll("li").remove();
    links.classed("hide", true);

  };


  //initialize graph with selection, data
  var network = function(selection, data) {
    main = d3.select(selection);
    allData = setupData(data);

    linksG = svg.append("g").attr("id", "links");
    nodesG = svg.append("g").attr("id", "nodes");

    update();
  };

  network.toggleFilter = function(newFilter) {
    force.stop();
    setFilter(newFilter);
    update();
  };

  //attach public functions to network object
  network.resize = function() {
    force.stop();
    graphSize("");
    update();
  };

  //return network object
  return network;
};

var processMembers = function(graph, callback) {
    ProfileService.queryByLocation({location: $scope.locationId, append_tags: 1}, function(data, header) {
        data.forEach(function(element, index, array) {
          var skills = [];
          for (var i in element.tags.skills) {
            skills.push(element.tags.skills[i].value);
          }
          graph.nodes.push(
                {
                    "id": "MEM" + element.owner,
                    "name": element.name,
                    "image": element.cropped_img_s3.url,
                    "thumbnail": element.thumb_img_s3.url,
                    "tagline": element.tagline,
                    "desc": element.desc,
                    "skills": skills,
                    "blog_url": element.blog_url,
                    "website_url": element.website_url,
                    "github_url": element.github_url,
                    "instagram_url": element.instagram_url,
                    "linkedin_url": element.linkedin_url,
                    "twitter_url": element.twitter_url,
                    "facebook_url": element.facebook_url,
                    "member_id": element._id,
                    "location": element.location,
                    "url": "//" + element.url,
                    "type": "mem",
                    "scale": 1,
                    "radius": 1
                }
            );
        });


        if (typeof callback == "function") {
          callback(graph);
        }
    });
};

var processProjects = function(graph, callback) {
    ProjectService.query({location: $scope.locationId, append_roles: 1, append_tags: 1}, function(data, header) {
        data.forEach(function(element, index, array) {
          var skills = [];
          for (var i in element.tags.skills) {
            skills.push(element.tags.skills[i].value);
          }
          graph.nodes.push(
              {
                "id": "PRJ" + element._id,
                "name": element.name,
                "image": element.cropped_img_s3.url,
                "thumbnail": element.cropped_img_s3.url,
                "tagline": element.tagline,
                "desc": element.desc,
                "url": "//" + element.url,
                "skills": skills,
                "owner": element.owner,
                "location": element.location,
                "scale": element.name === "100state" ? 20 : element.roles.length + 1,
                "type": "prj",
                "radius": 1
              }
            );

            element.roles.forEach(function(role, index, array) {
              if (role.assignee && role.assignee._id && element._id) {
                graph.links.push(
                  {
                    "source": "PRJ" + element._id,
                    "target": "MEM" + role.assignee._id,
                    "value": 1
                  }
                );
              }
            });
        });

        if (typeof callback == "function") {
          callback(graph);
        }
    });
};

var initGraph = function(graph) {
  var myGraph = Network();

  d3.select(window).on('resize', myGraph.resize);

  $scope.skillFilter = function() {
    var filter = {
      "type": "skill",
      "key": $scope.filters.skillValue
    };
    myGraph.toggleFilter(filter);
  };

  $scope.typeFilter = function() {
      var filter = {
        "type": "type",
        "key": $scope.typeFilterValue
      };
      myGraph.toggleFilter(filter);
  };

  myGraph("#data-viz", graph);

  myGraph.resize();
};

var graph = {"nodes": [], "links": []};

(function(a){(jQuery.browser=jQuery.browser||{}).mobile=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);

var isMobile = $.browser.mobile;
$(function() {
  if (!isMobile) {
    processMembers(graph, function(graph) {
      processProjects(graph, initGraph);
    });
  }
});
