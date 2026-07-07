                          ) : "-"}
                        </td>
                        <td className="p-3">
                          {order.status === "auf_tour" ? (
                            <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                              Tour {order.tour_number || "-"}
                            </span>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                    {!productionRows.length && (
                      <tr>
                        <td className="p-6 text-center font-semibold text-slate-500" colSpan="9">
                          Keine Kunden im gewaehlten Zeitraum.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {false && view === "leitung" && (
          <section className="space-y-5">
            <div className="grid gap-5 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5">
                <small>Waschplan</small>
                <div className="text-3xl font-black">
                  {WASH_CATEGORIES.reduce((sum, c) => sum + washRowsForCategory(c).length, 0)}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>In Bearbeitung</small>
                <div className="text-3xl font-black">{workingRows.length}</div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>Fertig</small>
                <div className="text-3xl font-black">{finishedRows.length}</div>
              </div>
              <div className="rounded-2xl border bg-white p-5">
                <small>Auf der Tour</small>
                <div className="text-3xl font-black">{tourRows.length}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Produktionsstatus je Kunde</h2>
                  <p className="text-slate-500">
                    Übernommen → Gewaschen → Fertig → Auf der Tour. Mit ↑ ↓ kann die Reihenfolge geändert werden.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">Reihenfolge</th>
                      <th className="p-3">Kundennummer</th>
                      <th className="p-3">Kunde</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Waschen</th>
                      <th className="p-3">Verpacken</th>
                      <th className="p-3">Container/Packerl</th>
                      <th className="p-3">Zusatz</th>
                      <th className="p-3">Tour</th>
                      <th className="p-3 text-right">Verschieben</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProductionOrders.map((order, index) => {
                      const status = getCustomerProductionStatus(order);
                      const details = getCustomerStatusDetails(order);
                      return (
                        <tr key={order.id} className="border-t">
                          <td className="p-3 font-semibold">{index + 1}</td>
                          <td className="p-3 font-mono font-semibold">{order.customer_number}</td>
                          <td className="p-3">
                            <b>{order.customer_name}</b>
                            {order.info && (
                              <div className="mt-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                ℹ {order.info}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full border px-3 py-1 font-black ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">
                            {details.washed}/{details.washTotal}
                          </td>
                          <td className="p-3 font-semibold">
                            {details.packed}/{details.packTotal}
                          </td>
                          <td className="p-3 font-black">
                            {order.container_count || "-"}
                          </td>
                          <td className="p-3">
                            {details.putzereiOpen ? (
                              <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                                P
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3">
                            {order.status === "auf_tour" ? (
                              <span className="rounded-full bg-violet-100 px-3 py-1 font-black text-violet-800">
                                Tour {order.tour_number || "-"}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <Button onClick={() => moveOrder(order, -1)}>↑</Button>
                              <Button onClick={() => moveOrder(order, 1)}>↓</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
