'use strict';
import { GitBranch } from '../models/branch';
import { debug } from '../../system';

const branchWithTrackingRegex = /^<h>(.+)<n>(.+)<u>(.*)<t>(?:\[(?:ahead ([0-9]+))?[,\s]*(?:behind ([0-9]+))?]|\[gone])?<r>(.*)$/gm;

// Using %x00 codes because some shells seem to try to expand things if not
const lb = '%3c'; // `%${'<'.charCodeAt(0).toString(16)}`;
const rb = '%3e'; // `%${'>'.charCodeAt(0).toString(16)}`;

export class GitBranchParser {
    static defaultFormat = [
        `${lb}h${rb}%(HEAD)`, // HEAD indicator
        `${lb}n${rb}%(refname:lstrip=1)`, // branch name
        `${lb}u${rb}%(upstream:short)`, // branch upstream
        `${lb}t${rb}%(upstream:track)`, // branch upstream tracking state
        `${lb}r${rb}%(objectname)` // ref
    ].join('');

    @debug({ args: false })
    static parse(data: string, repoPath: string): GitBranch[] {
        const branches: GitBranch[] = [];

        if (!data) return branches;

        let match: RegExpExecArray | null;
        let ahead;
        let aheadStr;
        let behind;
        let behindStr;
        let current;
        let name;
        let ref;
        let remote;
        let tracking;
        do {
            match = branchWithTrackingRegex.exec(data);
            if (match == null) break;

            [, current, name, tracking, aheadStr, behindStr, ref] = match;
            if (aheadStr !== undefined && aheadStr.length !== 0) {
                ahead = parseInt(aheadStr, 10);
                ahead = isNaN(ahead) ? 0 : ahead;
            }
            else {
                ahead = 0;
            }

            if (behindStr !== undefined && behindStr.length !== 0) {
                behind = parseInt(behindStr, 10);
                behind = isNaN(behind) ? 0 : behind;
            }
            else {
                behind = 0;
            }

            if (name.startsWith('remotes/')) {
                // Strip off remotes/
                name = name.substr(8);
                remote = true;
            }
            else {
                // Strip off heads/
                name = name.substr(6);
                remote = false;
            }

            branches.push(
                new GitBranch(
                    repoPath,
                    name,
                    remote,
                    current.charCodeAt(0) === 42, // '*',
                    // Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
                    ref === undefined || ref.length === 0 ? undefined : ` ${ref}`.substr(1),
                    // Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
                    tracking === undefined || tracking.length === 0 ? undefined : ` ${tracking}`.substr(1),
                    ahead,
                    behind
                )
            );
        } while (match != null);

        return branches;
    }
}
