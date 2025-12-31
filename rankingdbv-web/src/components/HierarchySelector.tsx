import { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { HIERARCHY_DATA } from '../lib/constants';
import { api } from '../lib/axios';

interface HierarchyState {
    union: string;
    association: string;
    region: string;
    district: string;
    mission: string; // Alias for association/mission
}

interface HierarchySelectorProps {
    value: HierarchyState;
    onChange: (value: HierarchyState) => void;
    readOnly?: boolean;
}

const uniaoOptions = Object.keys(HIERARCHY_DATA).sort();

export function HierarchySelector({ value, onChange, readOnly = false }: HierarchySelectorProps) {
    const [regions, setRegions] = useState<string[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);

    // Queries for filtering inputs
    const [queryUnion, setQueryUnion] = useState('');
    const [queryAssoc, setQueryAssoc] = useState('');
    const [queryRegion, setQueryRegion] = useState('');
    const [queryDistrict, setQueryDistrict] = useState('');

    // Fetch Regions when Association Changes
    useEffect(() => {
        if (!value.association) {
            setRegions([]);
            return;
        }
        setLoadingRegions(true);
        api.get(`/clubs/regions?association=${encodeURIComponent(value.association)}`)
            .then(res => setRegions(res.data))
            .catch(console.error)
            .finally(() => setLoadingRegions(false));
    }, [value.association]);

    // Fetch Districts when Region Changes
    useEffect(() => {
        if (!value.region) {
            setDistricts([]);
            return;
        }
        setLoadingDistricts(true);
        api.get(`/clubs/districts?region=${encodeURIComponent(value.region)}`)
            .then(res => setDistricts(res.data))
            .catch(console.error)
            .finally(() => setLoadingDistricts(false));
    }, [value.region]);

    const handleChange = (field: keyof HierarchyState, val: string) => {
        const newValue = { ...value, [field]: val };

        // Reset children
        if (field === 'union') {
            newValue.association = '';
            newValue.mission = '';
            newValue.region = '';
            newValue.district = '';
        } else if (field === 'association' || field === 'mission') {
            newValue.association = val;
            newValue.mission = val;
            newValue.region = '';
            newValue.district = '';
        } else if (field === 'region') {
            newValue.district = '';
        }

        onChange(newValue);
    };

    // Filter Logic
    const filteredUnions = queryUnion === ''
        ? uniaoOptions
        : uniaoOptions.filter((u) => u.toLowerCase().includes(queryUnion.toLowerCase()));

    const assocOptions = value.union ? (HIERARCHY_DATA[value.union] || []) : [];
    const filteredAssocs = queryAssoc === ''
        ? assocOptions
        : assocOptions.filter((a) => a.toLowerCase().includes(queryAssoc.toLowerCase()));

    const filteredRegions = queryRegion === ''
        ? regions
        : regions.filter((r) => r.toLowerCase().includes(queryRegion.toLowerCase()));

    const filteredDistricts = queryDistrict === ''
        ? districts
        : districts.filter((d) => d.toLowerCase().includes(queryDistrict.toLowerCase()));


    return (
        <div className="grid grid-cols-1 gap-4">
            {/* UNION */}
            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">União</label>
                <Combobox
                    value={value.union}
                    onChange={(val) => handleChange('union', val || '')}
                    disabled={readOnly}
                >
                    <div className="relative">
                        <Combobox.Input
                            className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900"
                            onChange={(event) => setQueryUnion(event.target.value)}
                            displayValue={(val: string) => val}
                            placeholder="Selecione ou digite..."
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                            <ChevronsUpDown className="w-4 h-4" />
                        </Combobox.Button>
                    </div>
                    <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                        {filteredUnions.length === 0 && queryUnion !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                                Nenhuma união encontrada.
                            </div>
                        ) : (
                            filteredUnions.map((u) => (
                                <Combobox.Option
                                    key={u}
                                    value={u}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'
                                        }`
                                    }
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                {u}
                                            </span>
                                            {selected ? (
                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-green-600' : 'text-green-600'}`}>
                                                    <Check className="w-5 h-5" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Combobox>
            </div>

            {/* ASSOCIATION */}
            {value.union && (
                <div className="relative transition-all animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Associação / Missão</label>
                    <Combobox
                        value={value.association}
                        onChange={(val) => handleChange('association', val || '')}
                        disabled={readOnly}
                    >
                        <div className="relative">
                            <Combobox.Input
                                className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900"
                                onChange={(event) => setQueryAssoc(event.target.value)}
                                displayValue={(val: string) => val}
                                placeholder="Selecione..."
                            />
                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                                <ChevronsUpDown className="w-4 h-4" />
                            </Combobox.Button>
                        </div>
                        <Combobox.Options className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {filteredAssocs.length === 0 && queryAssoc !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                                    Nenhuma associação encontrada.
                                </div>
                            ) : (
                                filteredAssocs.map((a) => (
                                    <Combobox.Option
                                        key={a}
                                        value={a}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'}`
                                        }
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{a}</span>
                                                {selected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                                        <Check className="w-5 h-5" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </Combobox>
                </div>
            )}

            {/* REGION (Creatable) */}
            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Região
                    {loadingRegions && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-slate-400" />}
                </label>
                <Combobox
                    value={value.region}
                    onChange={(val) => handleChange('region', val || '')}
                    disabled={readOnly || !value.association}
                >
                    <div className="relative">
                        <Combobox.Input
                            className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                            onChange={(event) => setQueryRegion(event.target.value)}
                            onBlur={(event) => handleChange('region', event.target.value)}
                            displayValue={(val: string) => val}
                            placeholder={value.association ? "R1, Região 1..." : "Selecione a Associação primeiro"}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                            <ChevronsUpDown className="w-4 h-4" />
                        </Combobox.Button>
                    </div>
                    {value.association && (
                        <Combobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {/* Allow Creating New Option */}
                            {queryRegion.length > 0 && !regions.some(r => r.toLowerCase() === queryRegion.toLowerCase()) && (
                                <Combobox.Option
                                    value={queryRegion}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'}`
                                    }
                                >
                                    Usar &quot;{queryRegion}&quot;
                                </Combobox.Option>
                            )}
                            {filteredRegions.map((r) => (
                                <Combobox.Option
                                    key={r}
                                    value={r}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'}`
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{r}</span>
                                            {selected && (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                                    <Check className="w-5 h-5" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    )}
                </Combobox>
            </div>


            {/* DISTRICT (Creatable) */}
            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Distrito
                    {loadingDistricts && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-slate-400" />}
                </label>
                <Combobox
                    value={value.district}
                    onChange={(val) => handleChange('district', val || '')}
                    disabled={readOnly || !value.region}
                >
                    <div className="relative">
                        <Combobox.Input
                            className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                            onChange={(event) => setQueryDistrict(event.target.value)}
                            onBlur={(event) => handleChange('district', event.target.value)}
                            displayValue={(val: string) => val}
                            placeholder={value.region ? "Distrito Central..." : "Selecione a Região primeiro"}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                            <ChevronsUpDown className="w-4 h-4" />
                        </Combobox.Button>
                    </div>
                    {value.region && (
                        <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {/* Allow Creating New Option */}
                            {queryDistrict.length > 0 && !districts.includes(queryDistrict) && (
                                <Combobox.Option
                                    value={queryDistrict}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'}`
                                    }
                                >
                                    Usar &quot;{queryDistrict}&quot;
                                </Combobox.Option>
                            )}
                            {filteredDistricts.map((d) => (
                                <Combobox.Option
                                    key={d}
                                    value={d}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-green-100 text-green-900' : 'text-slate-900'}`
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{d}</span>
                                            {selected && (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                                    <Check className="w-5 h-5" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    )}
                </Combobox>
            </div>
        </div>
    );
}
