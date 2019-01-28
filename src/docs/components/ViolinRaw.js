import React from "react"
import { summaryChart } from "../example_settings/orframe"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"

const axis = {
  orient: "left",
  tickFormat: d => d,
  label: {
    name: "axis label",
    position: { anchor: "middle" },
    locationDistance: 40
  }
}

const violinChart = {
  size: [700, 600],
  axis: axis,
  ...summaryChart,
  hoverAnnotation: true,
  tooltipContent: d => {
    return (
      <div className="tooltip-content">
        <p>{d.column.name}</p>
        <p>{d.column.pct}</p>
      </div>
    )
  },
  margin: { top: 75, bottom: 50, left: 60, right: 50 },
  dynamicColumnWidth: d => Math.max(...d.map(p => p.stepValue)),
  annotations: [
    {
      type: "category",
      categories: ["January", "February", "March"],
      label: "Q1",
      position: "top",
      offset: 15,
      depth: 10,
      padding: 0
    },
    {
      type: "category",
      categories: ["April", "May", "June"],
      label: "Q2",
      position: "top",
      offset: 15,
      depth: 10,
      padding: 0
    },
    {
      type: "category",
      categories: ["July", "August", "September"],
      label: "Q3",
      position: "top",
      offset: 15,
      depth: 10,
      padding: 0
    },
    {
      type: "category",
      categories: ["October", "November", "December"],
      label: "Q4",
      position: "top",
      offset: 15,
      depth: 10,
      padding: 0
    },
    {
      type: "category",
      categories: [
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ],
      label: "Latter Half",
      position: "top",
      offset: 45,
      depth: 10,
      padding: 0
    },
    {
      type: "check-html",
      stepValue: 70,
      stepName: "January",
      label: "come on this is 70"
    },
    {
      type: "check-html",
      stepValue: 30,
      stepName: "August",
      label: "30 here is 30"
    }
  ]
}

export default (
  <div>
    <ProcessViz frameSettings={violinChart} frameType="OrdinalFrame" />
    <OrdinalFrame
      {...violinChart}
      htmlAnnotationRules={({ d, oScale, rScale }) => {
        if (d.type === "check-html") {
          return (
            <div
              style={{
                left: `${oScale(d.stepName)}px`,
                top: `${rScale(d.stepValue)}px`,
                position: "absolute"
              }}
            >
              Hello der - {d.label}
            </div>
          )
        }
        return null
      }}
    />
  </div>
)
